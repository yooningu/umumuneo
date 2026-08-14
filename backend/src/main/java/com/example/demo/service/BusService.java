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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

// 부산광역시_부산버스정보시스템(BIMS) 연동. 기본 정류장(ARS번호)에서 출근버스 노선들 도착정보만 뽑아서 쓴다.
@Service
@RequiredArgsConstructor
public class BusService {

    @Value("${bus.busan.service-key}")
    private String serviceKey; // data.go.kr에서 발급하는 형식 그대로(이미 URL 인코딩된 값) 사용

    @Value("${bus.busan.base-url}")
    private String baseUrl;

    @Value("${bus.busan.default-arsno}")
    private String defaultArsno;

    // 출근버스로 챙겨볼 노선 번호
    private static final List<String> COMMUTE_LINES = List.of("8", "11", "103");

    public record BusArrival(String lineno, String nodenm, String min1, String station1, String min2, String station2) {}

    // 기본 정류장에서 출근버스(8/11/103) 도착정보만 자연어로 정리
    public String getCommuteBusText() throws Exception {
        List<BusArrival> arrivals = getArrivals(defaultArsno);
        if (arrivals.isEmpty()) {
            return "정류장 정보를 찾을 수 없어요.";
        }

        String stopName = arrivals.get(0).nodenm();
        StringBuilder sb = new StringBuilder("🚌 " + stopName + " 정류장\n");
        for (String line : COMMUTE_LINES) {
            BusArrival a = arrivals.stream().filter(x -> line.equals(x.lineno())).findFirst().orElse(null);
            sb.append(line).append("번: ").append(a == null ? "이 정류장에 없는 노선이에요" : formatArrival(a)).append("\n");
        }
        return sb.toString().trim();
    }

    // 정류장(ARS 번호) 도착정보 원본 목록 조회
    public List<BusArrival> getArrivals(String arsno) throws Exception {
        String url = baseUrl + "/bitArrByArsno?arsno=" + arsno + "&serviceKey=" + serviceKey;

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
        if (!"00".equals(resultCode)) {
            throw new RuntimeException("부산버스 API 오류: " + firstText(doc, "resultMsg"));
        }

        List<BusArrival> result = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            result.add(new BusArrival(
                    childText(item, "lineno"),
                    childText(item, "nodenm"),
                    childText(item, "min1"),
                    childText(item, "station1"),
                    childText(item, "min2"),
                    childText(item, "station2")
            ));
        }
        return result;
    }

    // "N분 후 도착 (M정류장 전)" / "운행대기" / 정보 없으면 null
    private String formatArrival(BusArrival a) {
        List<String> parts = new ArrayList<>();
        String first = describeOne(a.min1(), a.station1());
        if (first != null) parts.add(first);
        String second = describeOne(a.min2(), a.station2());
        if (second != null) parts.add(second);
        return parts.isEmpty() ? "운행 정보 없음" : String.join(" / ", parts);
    }

    private String describeOne(String min, String station) {
        if (min == null || min.isBlank()) return null;
        if ("운행대기".equals(min)) return "운행대기";
        return min + "분 후 도착" + (station != null && !station.isBlank() ? " (" + station + "정류장 전)" : "");
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
