package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// 한국천문연구원_특일 정보(공휴일) 연동. data.go.kr 서비스키는 부산버스 API(BusService)와 동일한 키를 재사용.
@Service
@RequiredArgsConstructor
public class HolidayService {

    @Value("${holiday.service-key}")
    private String serviceKey; // data.go.kr에서 발급하는 형식 그대로(이미 URL 인코딩된 값) 사용

    private static final String BASE_URL = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

    public record Holiday(String date, String name) {} // date: "YYYY-MM-DD"

    // 공휴일 데이터는 안 바뀌니까 연+월 단위로 캐싱해서 외부 API를 반복 호출하지 않음
    private final Map<String, List<Holiday>> cache = new ConcurrentHashMap<>();

    public List<Holiday> getHolidays(int year, int month) throws Exception {
        String cacheKey = year + "-" + month;
        List<Holiday> cached = cache.get(cacheKey);
        if (cached != null) return cached;

        String url = BASE_URL
                + "?serviceKey=" + serviceKey
                + "&solYear=" + year
                + "&solMonth=" + String.format("%02d", month)
                + "&numOfRows=100";

        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(15000);

        String body;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            body = sb.toString();
        }

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        DocumentBuilder builder = factory.newDocumentBuilder();
        Document doc = builder.parse(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));

        String resultCode = firstText(doc, "resultCode");
        if (resultCode != null && !"00".equals(resultCode)) {
            throw new RuntimeException("공휴일 API 오류: " + firstText(doc, "resultMsg"));
        }

        List<Holiday> result = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            if (!"Y".equals(childText(item, "isHoliday"))) continue; // 공휴일(빨간날)만
            String locdate = childText(item, "locdate"); // yyyyMMdd
            if (locdate == null || locdate.length() != 8) continue;
            String date = locdate.substring(0, 4) + "-" + locdate.substring(4, 6) + "-" + locdate.substring(6, 8);
            result.add(new Holiday(date, childText(item, "dateName")));
        }
        cache.put(cacheKey, result);
        return result;
    }

    // 챗봇이 "올해 남은 휴일 수" 같은 질문에 답할 수 있도록, 오늘부터 올해 12월 31일까지의
    // 공식 공휴일 목록 + 주말(토/일) 일수를 한눈에 보도록 정리한 텍스트. 공휴일이 주말과 겹치는
    // 날은 "쉬는 날" 합계에서 한 번만 센다(이중 집계 방지).
    public String getRemainingHolidaySummaryText() throws Exception {
        LocalDate today = LocalDate.now();
        int year = today.getYear();
        LocalDate yearEnd = LocalDate.of(year, 12, 31);

        List<Holiday> remainingHolidays = new ArrayList<>();
        for (int month = today.getMonthValue(); month <= 12; month++) {
            for (Holiday h : getHolidays(year, month)) {
                if (!LocalDate.parse(h.date()).isBefore(today)) remainingHolidays.add(h);
            }
        }

        long weekendDays = 0;
        long holidayWeekendOverlap = 0;
        for (LocalDate d = today; !d.isAfter(yearEnd); d = d.plusDays(1)) {
            boolean isWeekend = d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
            if (isWeekend) {
                weekendDays++;
                boolean isAlsoHoliday = remainingHolidays.stream().anyMatch(h -> h.date().equals(d.toString()));
                if (isAlsoHoliday) holidayWeekendOverlap++;
            }
        }

        long totalDaysOff = remainingHolidays.size() + weekendDays - holidayWeekendOverlap;

        StringBuilder sb = new StringBuilder();
        sb.append("오늘: ").append(today).append("\n");
        sb.append("올해(").append(year).append(") 12월 31일까지 남은 공식 공휴일: ").append(remainingHolidays.size()).append("개\n");
        for (Holiday h : remainingHolidays) {
            sb.append("- ").append(h.date()).append(" ").append(h.name()).append("\n");
        }
        sb.append("같은 기간 남은 주말(토/일) 일수: ").append(weekendDays).append("일 (공휴일과 겹치는 날 ").append(holidayWeekendOverlap).append("일 포함)\n");
        sb.append("공휴일+주말을 합쳐 겹치는 날 한 번만 센 '올해 남은 쉬는 날' 총합: ").append(totalDaysOff).append("일");
        return sb.toString();
    }

    private String firstText(Document doc, String tag) {
        NodeList nodes = doc.getElementsByTagName(tag);
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent() : null;
    }

    private String childText(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent() : null;
    }
}
