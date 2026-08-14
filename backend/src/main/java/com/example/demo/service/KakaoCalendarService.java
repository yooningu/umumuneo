package com.example.demo.service;

import com.example.demo.entity.Schedule;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 카카오 "톡캘린더"에 일정을 동일하게 등록/수정/삭제하는 서비스.
// 참고: color 매핑은 카카오 개발자 문서의 정확한 색상 enum 목록을 실제 호출로 확인 전이라
// 근사치로만 매핑해뒀습니다. talk_calendar 동의를 실제로 받은 뒤 한번 테스트해보고 필요하면 알려주세요.
@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoCalendarService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final ZoneId UTC = ZoneId.of("UTC");
    private static final DateTimeFormatter UTC_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private static final Map<String, int[]> KAKAO_COLORS = Map.ofEntries(
            Map.entry("RED", new int[]{255, 59, 48}),
            Map.entry("ORANGE", new int[]{255, 149, 0}),
            Map.entry("YELLOW", new int[]{255, 204, 0}),
            Map.entry("GREEN", new int[]{52, 199, 89}),
            Map.entry("BLUE", new int[]{0, 122, 255}),
            Map.entry("NAVY", new int[]{27, 20, 100}),
            Map.entry("PURPLE", new int[]{175, 82, 222}),
            Map.entry("PINK", new int[]{255, 45, 85}),
            Map.entry("GRAY", new int[]{142, 142, 147}),
            Map.entry("BROWN", new int[]{162, 132, 94})
    );

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    // 톡캘린더에 일정 등록. 성공하면 event_id, 실패(미동의/토큰없음 등)하면 null 반환.
    // 캘린더 등록 실패가 일정 생성 자체를 막으면 안 되므로 예외를 던지지 않고 삼킨다.
    public String createEvent(User user, Schedule schedule, int offsetMin) {
        return callSafely(user, "톡캘린더 등록", accessToken -> doCreate(accessToken, schedule, offsetMin));
    }

    // 톡캘린더 이벤트 수정. 성공 여부 반환 (실패해도 예외를 던지지 않음).
    public boolean updateEvent(User user, String eventId, Schedule schedule, int offsetMin) {
        String result = callSafely(user, "톡캘린더 수정", accessToken -> {
            doUpdate(accessToken, eventId, schedule, offsetMin);
            return "OK";
        });
        return result != null;
    }

    // 톡캘린더 이벤트 삭제. 성공 여부 반환 (실패해도 예외를 던지지 않음).
    public boolean deleteEvent(User user, String eventId) {
        String result = callSafely(user, "톡캘린더 삭제", accessToken -> {
            doDelete(accessToken, eventId);
            return "OK";
        });
        return result != null;
    }

    private interface KakaoCall {
        String call(String accessToken) throws Exception;
    }

    // 액세스 토큰으로 호출 -> 401이면 재발급 후 1회 재시도 -> 그래도 실패하면 null (예외를 밖으로 던지지 않음)
    private String callSafely(User user, String actionName, KakaoCall call) {
        String accessToken = user.getKakaoAccessToken();
        if (accessToken == null) {
            log.warn("카카오 액세스 토큰이 없어 {}을(를) 건너뜁니다.", actionName);
            return null;
        }
        try {
            return call.call(accessToken);
        } catch (HttpClientErrorException.Unauthorized e) {
            log.info("카카오 토큰 만료, 재발급 후 {} 재시도...", actionName);
            try {
                String newAccessToken = refreshKakaoToken(user);
                return call.call(newAccessToken);
            } catch (Exception retryEx) {
                log.error("{} 재시도 실패: {}", actionName, retryEx.getMessage());
                return null;
            }
        } catch (Exception e) {
            log.error("{} 실패: {}", actionName, e.getMessage());
            return null;
        }
    }

    private String doCreate(String accessToken, Schedule schedule, int offsetMin) throws Exception {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("event", objectMapper.writeValueAsString(buildEvent(schedule, offsetMin)));

        ResponseEntity<Map> response = post("https://kapi.kakao.com/v2/api/calendar/create/event", accessToken, body);
        Object eventId = response.getBody() != null ? response.getBody().get("event_id") : null;
        return eventId != null ? eventId.toString() : null;
    }

    private void doUpdate(String accessToken, String eventId, Schedule schedule, int offsetMin) throws Exception {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("event_id", eventId);
        body.add("event", objectMapper.writeValueAsString(buildEvent(schedule, offsetMin)));

        post("https://kapi.kakao.com/v2/api/calendar/update/event", accessToken, body);
    }

    private void doDelete(String accessToken, String eventId) throws Exception {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("event_id", eventId);

        post("https://kapi.kakao.com/v2/api/calendar/delete/event", accessToken, body);
    }

    private ResponseEntity<Map> post(String url, String accessToken, MultiValueMap<String, String> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBearerAuth(accessToken);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);

        if (response.getStatusCode() != HttpStatus.OK) {
            throw new RuntimeException("톡캘린더 API 호출 실패 (" + url + "): " + response.getStatusCode());
        }
        return response;
    }

    // Schedule -> 카카오 캘린더 이벤트 요청 형식
    private Map<String, Object> buildEvent(Schedule schedule, int offsetMin) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("title", schedule.getTitle());
        event.put("time", buildTime(schedule));
        if (schedule.getDescription() != null && !schedule.getDescription().isBlank()) {
            event.put("description", schedule.getDescription());
        }
        event.put("reminders", List.of(offsetMin));
        event.put("color", nearestKakaoColor(schedule.getColor()));
        return event;
    }

    private Map<String, Object> buildTime(Schedule schedule) {
        boolean allDay = schedule.getType() == Schedule.ScheduleType.ALLDAY
                || schedule.getType() == Schedule.ScheduleType.PERIOD;

        LocalDateTime start;
        LocalDateTime end;

        if (allDay) {
            LocalDate endDate = schedule.getEndDate() != null ? schedule.getEndDate() : schedule.getStartDate();
            start = schedule.getStartDate().atStartOfDay();
            end = endDate.plusDays(1).atStartOfDay(); // 종료일 다음날 00:00 (반열림 구간)
        } else {
            LocalTime startTime = schedule.getStartTime() != null ? schedule.getStartTime() : LocalTime.of(9, 0);
            LocalTime endTime = schedule.getEndTime() != null ? schedule.getEndTime() : startTime.plusMinutes(30);
            start = schedule.getStartDate().atTime(startTime);
            end = schedule.getStartDate().atTime(endTime);
        }

        Map<String, Object> time = new LinkedHashMap<>();
        time.put("start_at", toUtc(start));
        time.put("end_at", toUtc(end));
        time.put("time_zone", "Asia/Seoul");
        time.put("all_day", allDay);
        time.put("lunar", false);
        return time;
    }

    private String toUtc(LocalDateTime kstDateTime) {
        return kstDateTime.atZone(KST).withZoneSameInstant(UTC).format(UTC_FORMAT);
    }

    // 일정 색상(hex) -> 카카오 캘린더 색상 enum 중 가장 가까운 값 선택
    private String nearestKakaoColor(String hex) {
        if (hex == null || !hex.matches("^#?[0-9a-fA-F]{6}$")) return "BLUE";
        String h = hex.startsWith("#") ? hex.substring(1) : hex;
        int r = Integer.parseInt(h.substring(0, 2), 16);
        int g = Integer.parseInt(h.substring(2, 4), 16);
        int b = Integer.parseInt(h.substring(4, 6), 16);

        String nearest = "BLUE";
        double bestDist = Double.MAX_VALUE;
        for (Map.Entry<String, int[]> entry : KAKAO_COLORS.entrySet()) {
            int[] c = entry.getValue();
            double dist = Math.pow(r - c[0], 2) + Math.pow(g - c[1], 2) + Math.pow(b - c[2], 2);
            if (dist < bestDist) {
                bestDist = dist;
                nearest = entry.getKey();
            }
        }
        return nearest;
    }

    // 카카오 액세스 토큰 재발급
    private String refreshKakaoToken(User user) {
        String refreshToken = user.getKakaoRefreshToken();
        if (refreshToken == null) {
            throw new RuntimeException("카카오 리프레시 토큰이 없습니다. 재로그인이 필요합니다.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("client_id", kakaoClientId);
        body.add("refresh_token", refreshToken);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://kauth.kakao.com/oauth/token",
                request,
                Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        String newAccessToken = (String) responseBody.get("access_token");

        user.setKakaoAccessToken(newAccessToken);
        if (responseBody.containsKey("refresh_token")) {
            user.setKakaoRefreshToken((String) responseBody.get("refresh_token"));
        }
        userRepository.save(user);
        log.info("카카오 토큰 재발급 완료 (톡캘린더용)");

        return newAccessToken;
    }
}
