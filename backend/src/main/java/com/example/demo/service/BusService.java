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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

// 부산광역시_부산버스정보시스템(BIMS) 연동. 기본 정류장(ARS번호)에서 출근버스 노선들 도착정보만 뽑아서 쓴다.
// (우무 챗봇의 출근버스 하드코딩 기능 전용 - 아래 TAGO 연동과는 완전히 별개)
@Service
@RequiredArgsConstructor
public class BusService {

    @Value("${bus.busan.service-key}")
    private String serviceKey; // data.go.kr에서 발급하는 형식 그대로(이미 URL 인코딩된 값) 사용

    @Value("${bus.busan.base-url}")
    private String baseUrl;

    @Value("${bus.busan.default-arsno}")
    private String defaultArsno;

    // 국가대중교통정보센터(TAGO) - 버스정류소정보조회 서비스(BusSttnInfoInqireService).
    // 좌표기반근접정류소 목록조회 / 정류소별경유노선 목록조회에 사용
    @Value("${tago.service-key}")
    private String tagoServiceKey;

    @Value("${tago.sttninfo-base-url}")
    private String tagoSttnInfoBaseUrl;

    // 국가대중교통정보센터(TAGO) - 버스도착정보조회 서비스(ArvlInfoInqireService).
    // 정류소별 실시간 도착예정정보(전체 노선 / 특정 노선)에 사용
    @Value("${tago.arvlinfo-base-url}")
    private String tagoArvlInfoBaseUrl;

    // 출근버스로 챙겨볼 노선 번호
    private static final List<String> COMMUTE_LINES = List.of("8", "11", "103");

    public record BusArrival(String lineno, String nodenm, String min1, String station1, String min2, String station2) {}

    // TAGO 근처 정류장 검색 결과 (nodeId/cityCode는 TAGO 전국 통합 체계 - 부산 BIMS의 arsno와는 다른 번호 체계)
    public record NearbyStop(String nodeId, String cityCode, String stopName, double latitude, double longitude) {}

    // 정류소를 지나는 노선 목록 - 즐겨찾기에 추가할 노선을 고를 때 사용
    public record StopRoute(String routeId, String routeNo, String routeType, String startStopName, String endStopName) {}

    // TAGO 도착정보 (정류소별 전체 노선 / 특정 노선 공용)
    public record TagoArrival(String nodeId, String stopName, String routeId, String routeNo, String routeType,
                               Integer stationsLeft, String vehicleType, Integer arrivalSeconds) {}

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
        Document doc = fetchXml(url);

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

    // 좌표 주변 정류장 검색 (TAGO 좌표기반근접정류소 목록조회, getCrdntPrxmtSttnList)
    public List<NearbyStop> findNearbyStops(double lat, double lon) throws Exception {
        String url = tagoSttnInfoBaseUrl + "/getCrdntPrxmtSttnList"
                + "?serviceKey=" + tagoServiceKey
                + "&gpsLati=" + lat + "&gpsLong=" + lon
                + "&numOfRows=20&pageNo=1&_type=xml";
        Document doc = fetchXml(url);
        checkTagoResult(doc, "정류장 검색");

        List<NearbyStop> result = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String latStr = childText(item, "gpslati");
            String lonStr = childText(item, "gpslong");
            result.add(new NearbyStop(
                    childText(item, "nodeid"),
                    childText(item, "citycode"),
                    childText(item, "nodenm"),
                    latStr != null ? Double.parseDouble(latStr) : 0,
                    lonStr != null ? Double.parseDouble(lonStr) : 0
            ));
        }
        return result;
    }

    // 정류소별 경유노선 목록 조회 (TAGO, getSttnThrghRouteList) - 즐겨찾기에 추가할 노선 선택용
    public List<StopRoute> getRoutesForStop(String cityCode, String nodeId) throws Exception {
        String url = tagoSttnInfoBaseUrl + "/getSttnThrghRouteList"
                + "?serviceKey=" + tagoServiceKey
                + "&cityCode=" + cityCode + "&nodeid=" + URLEncoder.encode(nodeId, StandardCharsets.UTF_8)
                + "&numOfRows=100&pageNo=1&_type=xml";
        Document doc = fetchXml(url);
        checkTagoResult(doc, "경유노선 조회");

        List<StopRoute> result = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            result.add(new StopRoute(
                    childText(item, "routeid"),
                    childText(item, "routeno"),
                    childText(item, "routetp"),
                    childText(item, "startnodenm"),
                    childText(item, "endnodenm")
            ));
        }
        return result;
    }

    // 정류소별 도착예정정보 전체 조회 (TAGO, getSttnAcctoArvlPrearngeInfoList)
    public List<TagoArrival> getTagoArrivals(String cityCode, String nodeId) throws Exception {
        String url = tagoArvlInfoBaseUrl + "/getSttnAcctoArvlPrearngeInfoList"
                + "?serviceKey=" + tagoServiceKey
                + "&cityCode=" + cityCode + "&nodeId=" + URLEncoder.encode(nodeId, StandardCharsets.UTF_8)
                + "&numOfRows=50&pageNo=1&_type=xml";
        return parseTagoArrivals(fetchXml(url));
    }

    // 정류소별 특정노선버스 도착예정정보 조회 (TAGO, getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList)
    // - 노선별 알람 기능에서 "이 노선 몇 분 남았는지"만 콕 집어 확인할 때 사용
    public List<TagoArrival> getTagoArrivalsForRoute(String cityCode, String nodeId, String routeId) throws Exception {
        String url = tagoArvlInfoBaseUrl + "/getSttnAcctoSpcifyRouteBusArvlPrearngeInfoList"
                + "?serviceKey=" + tagoServiceKey
                + "&cityCode=" + cityCode + "&nodeId=" + URLEncoder.encode(nodeId, StandardCharsets.UTF_8)
                + "&routeId=" + URLEncoder.encode(routeId, StandardCharsets.UTF_8)
                + "&numOfRows=10&pageNo=1&_type=xml";
        return parseTagoArrivals(fetchXml(url));
    }

    private List<TagoArrival> parseTagoArrivals(Document doc) throws Exception {
        checkTagoResult(doc, "도착정보 조회");

        List<TagoArrival> result = new ArrayList<>();
        NodeList items = doc.getElementsByTagName("item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String stationsLeft = childText(item, "arrprevstationcnt");
            String arrivalSeconds = childText(item, "arrtime");
            result.add(new TagoArrival(
                    childText(item, "nodeid"),
                    childText(item, "nodenm"),
                    childText(item, "routeid"),
                    childText(item, "routeno"),
                    childText(item, "routetp"),
                    stationsLeft != null && !stationsLeft.isBlank() ? Integer.parseInt(stationsLeft) : null,
                    childText(item, "vehicletp"),
                    arrivalSeconds != null && !arrivalSeconds.isBlank() ? Integer.parseInt(arrivalSeconds) : null
            ));
        }
        return result;
    }

    private void checkTagoResult(Document doc, String context) {
        String resultCode = firstText(doc, "resultCode");
        if (resultCode != null && !"00".equals(resultCode)) {
            throw new RuntimeException("TAGO " + context + " API 오류: " + firstText(doc, "resultMsg"));
        }
    }

    private Document fetchXml(String url) throws Exception {
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
        return builder.parse(new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
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
