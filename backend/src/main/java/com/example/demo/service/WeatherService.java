package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;

// 기상청 API허브 "단기예보조회(getVilageFcst)" 연동. 오늘 포함 최대 5일치 최저/최고기온 + 강수확률만 뽑아서 쓴다.
// 숫자는 LLM을 거치지 않고 여기서 API 응답 그대로 조립해서 보여준다 (LLM이 수치를 잘못 옮겨 적는 걸 방지).
@Service
@RequiredArgsConstructor
public class WeatherService {

    private final ObjectMapper objectMapper;

    @Value("${kma.auth-key}")
    private String authKey;

    @Value("${kma.base-url}")
    private String baseUrl;

    @Value("${kma.nx}")
    private int nx;

    @Value("${kma.ny}")
    private int ny;

    // 단기예보 발표시각: 하루 8회 (2,5,8,11,14,17,20,23시)
    private static final int[] BASE_HOURS = {2, 5, 8, 11, 14, 17, 20, 23};
    // 발표 후 실제 자료가 API에 반영되기까지 걸리는 지연을 감안한 안전 버퍼
    private static final int PUBLISH_DELAY_MIN = 40;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter DAY_LABEL_FMT = DateTimeFormatter.ofPattern("M월 d일(E)", Locale.KOREAN);

    public record DayForecast(LocalDate date, Double minTemp, Double maxTemp, Integer maxPop) {}

    // 챗봇이 그대로 보여줄 수 있는 자연어 요약 텍스트
    public String getWeeklySummaryText() throws Exception {
        List<DayForecast> days = getForecast();
        if (days.isEmpty()) {
            return "지금은 날씨 정보를 가져올 수 없어요. 잠시 후 다시 시도해주세요.";
        }

        LocalDate today = LocalDate.now();
        StringBuilder sb = new StringBuilder("🌤️ 날씨 예보\n");
        for (DayForecast d : days) {
            String dayLabel = d.date().equals(today) ? "오늘" : d.date().format(DAY_LABEL_FMT);
            List<String> parts = new ArrayList<>();
            if (d.minTemp() != null && d.maxTemp() != null) {
                parts.add(String.format("%.0f°~%.0f°", d.minTemp(), d.maxTemp()));
            } else if (d.maxTemp() != null) {
                parts.add(String.format("최고 %.0f°", d.maxTemp()));
            } else if (d.minTemp() != null) {
                parts.add(String.format("최저 %.0f°", d.minTemp()));
            }
            if (d.maxPop() != null) {
                parts.add("강수확률 " + d.maxPop() + "%");
            }
            if (!parts.isEmpty()) {
                sb.append(dayLabel).append(": ").append(String.join(", ", parts)).append("\n");
            }
        }
        return sb.toString().trim();
    }

    // 오늘부터 API가 제공하는 마지막 날짜까지, 일별 최저/최고기온 + 그날 중 최대 강수확률
    public List<DayForecast> getForecast() throws Exception {
        String[] base = computeBaseDateTime();
        JsonNode items = callApi(base[0], base[1]);

        Map<String, Double> minByDate = new LinkedHashMap<>();
        Map<String, Double> maxByDate = new LinkedHashMap<>();
        Map<String, Integer> popByDate = new LinkedHashMap<>();
        TreeSet<String> dates = new TreeSet<>();

        for (JsonNode item : items) {
            String date = item.path("fcstDate").asText();
            String category = item.path("category").asText();
            String value = item.path("fcstValue").asText();
            dates.add(date);

            try {
                switch (category) {
                    case "TMN" -> minByDate.put(date, Double.parseDouble(value));
                    case "TMX" -> maxByDate.put(date, Double.parseDouble(value));
                    case "POP" -> popByDate.merge(date, Integer.parseInt(value), Math::max);
                    default -> { /* 기온/강수확률 외 항목은 지금은 안 씀 */ }
                }
            } catch (NumberFormatException ignored) {
                // "강수없음" 같은 비수치 값은 건너뜀
            }
        }

        List<DayForecast> result = new ArrayList<>();
        for (String dateStr : dates) {
            LocalDate date = LocalDate.parse(dateStr, DATE_FMT);
            result.add(new DayForecast(date, minByDate.get(dateStr), maxByDate.get(dateStr), popByDate.get(dateStr)));
        }
        return result;
    }

    // 지금 시각 기준으로 가장 최근에 발표됐을 단기예보 회차(base_date, base_time)를 계산
    private String[] computeBaseDateTime() {
        LocalDateTime now = LocalDateTime.now().minusMinutes(PUBLISH_DELAY_MIN);
        LocalDate date = now.toLocalDate();
        int hour = now.getHour();

        Integer chosenHour = null;
        for (int i = BASE_HOURS.length - 1; i >= 0; i--) {
            if (BASE_HOURS[i] <= hour) {
                chosenHour = BASE_HOURS[i];
                break;
            }
        }
        if (chosenHour == null) {
            // 00~01시대엔 아직 오늘 첫 발표(02시) 전이라 전날 23시 발표가 최신 자료임
            date = date.minusDays(1);
            chosenHour = 23;
        }

        return new String[]{date.format(DATE_FMT), String.format("%02d00", chosenHour)};
    }

    private JsonNode callApi(String baseDate, String baseTime) throws Exception {
        String url = baseUrl
                + "?pageNo=1&numOfRows=1000&dataType=JSON"
                + "&base_date=" + baseDate
                + "&base_time=" + baseTime
                + "&nx=" + nx + "&ny=" + ny
                + "&authKey=" + authKey;

        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(15000);

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);

            JsonNode root = objectMapper.readTree(body.toString());

            // 활용신청 안 된 API를 부르면 이 형태({"result":{"status":403,...}})로 옴
            JsonNode errorResult = root.path("result");
            if (!errorResult.isMissingNode()) {
                throw new RuntimeException("기상청 API 오류: " + errorResult.path("message").asText());
            }

            String resultCode = root.path("response").path("header").path("resultCode").asText();
            if (!"00".equals(resultCode)) {
                String resultMsg = root.path("response").path("header").path("resultMsg").asText();
                throw new RuntimeException("기상청 API 오류: " + resultMsg);
            }

            return root.path("response").path("body").path("items").path("item");
        }
    }
}
