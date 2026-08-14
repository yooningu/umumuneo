package com.example.demo.service;

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

import java.util.LinkedHashMap;
import java.util.Map;

// 카카오톡 "나에게 보내기" - 챗봇이 요청받은 내용을 즉시 카카오톡 메시지로 전송
// (일정 알림은 더 이상 여기서 보내지 않음 -> KakaoCalendarService/톡캘린더가 대체)
@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoNotificationService {

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    // 임의의 텍스트를 카카오톡 "나에게 보내기"로 즉시 발송
    public void sendText(User user, String text) throws Exception {
        String accessToken = user.getKakaoAccessToken();
        if (accessToken == null) {
            throw new RuntimeException("카카오 액세스 토큰이 없습니다.");
        }

        try {
            doSend(accessToken, text);
        } catch (HttpClientErrorException.Unauthorized e) {
            log.info("카카오 토큰 만료, 재발급 시도...");
            String newAccessToken = refreshKakaoToken(user);
            doSend(newAccessToken, text);
        }
    }

    // 실제 메시지 발송
    private void doSend(String accessToken, String text) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBearerAuth(accessToken);

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("object_type", "text");
        template.put("text", text);
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("web_url", "http://localhost:5173");
        link.put("mobile_web_url", "http://localhost:5173");
        template.put("link", link);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("template_object", objectMapper.writeValueAsString(template));

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://kapi.kakao.com/v2/api/talk/memo/default/send",
                request,
                Map.class
        );

        if (response.getStatusCode() != HttpStatus.OK) {
            throw new RuntimeException("카카오 메시지 발송 실패: " + response.getStatusCode());
        }
    }

    // 이미지를 카카오톡 "나에게 보내기"의 피드형 메시지로 즉시 발송.
    // imageUrl은 카카오 서버가 직접 접근할 수 있는 "공개" URL이어야 함 (인증 필요한 주소 불가).
    // 로컬 개발 환경(localhost)에서는 카카오 서버가 접근할 수 없어 실패함 - 배포 후 공개 도메인에서만 동작.
    public void sendImage(User user, String imageUrl, String title) throws Exception {
        String accessToken = user.getKakaoAccessToken();
        if (accessToken == null) {
            throw new RuntimeException("카카오 액세스 토큰이 없습니다.");
        }

        try {
            doSendImage(accessToken, imageUrl, title);
        } catch (HttpClientErrorException.Unauthorized e) {
            log.info("카카오 토큰 만료, 재발급 시도...");
            String newAccessToken = refreshKakaoToken(user);
            doSendImage(newAccessToken, imageUrl, title);
        }
    }

    private void doSendImage(String accessToken, String imageUrl, String title) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBearerAuth(accessToken);

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("title", title);
        content.put("description", "챗봇으로 보낸 이미지예요.");
        content.put("image_url", imageUrl);
        content.put("image_width", 640);
        content.put("image_height", 640);
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("web_url", imageUrl);
        link.put("mobile_web_url", imageUrl);
        content.put("link", link);

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("object_type", "feed");
        template.put("content", content);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("template_object", objectMapper.writeValueAsString(template));

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://kapi.kakao.com/v2/api/talk/memo/default/send",
                request,
                Map.class
        );

        if (response.getStatusCode() != HttpStatus.OK) {
            throw new RuntimeException("카카오 이미지 메시지 발송 실패: " + response.getStatusCode());
        }
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

        // 새 액세스 토큰 DB 저장
        user.setKakaoAccessToken(newAccessToken);

        // 리프레시 토큰도 새로 발급된 경우 업데이트
        if (responseBody.containsKey("refresh_token")) {
            user.setKakaoRefreshToken((String) responseBody.get("refresh_token"));
        }

        userRepository.save(user);
        log.info("카카오 토큰 재발급 완료");

        return newAccessToken;
    }
}
