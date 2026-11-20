package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.demo.util.KmaGridConverter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// 브이월드(VWorld, 국토교통부) Geocoder API 연동 - 주소 문자열 <-> 위경도 변환을 담당.
// 사용자가 집 위치를 1) 주소를 직접 입력하거나 2) GPS로 잡거나, 둘 중 뭘 쓰든 결국 여기서
// 위경도 + 행정동 이름으로 정리된 LocationInfo 하나로 합쳐서 돌려준다.
@Service
@RequiredArgsConstructor
public class AddressService {

    private final ObjectMapper objectMapper;

    @Value("${vworld.api-key}")
    private String apiKey;

    private static final String BASE_URL = "https://api.vworld.kr/req/address";

    // 위경도 + 행정동 이름 + 기상청 격자좌표(nx,ny)까지 한 번에 - User 엔티티에 그대로 저장해서 씀
    public record LocationInfo(double latitude, double longitude, String adminDong, int kmaNx, int kmaNy) {}

    // 주소 문자열(도로명/지번 아무거나) -> 위경도. 입력이 애매하면(여러 후보, 못 찾음) 예외를 던짐 -
    // 프론트에서 "주소를 더 정확히 입력해주세요" 식으로 보여주면 됨
    public LocationInfo geocodeAddress(String address) throws Exception {
        String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8);
        String url = BASE_URL + "?service=address&request=getcoord&version=2.0&crs=epsg:4326"
                + "&address=" + encoded + "&type=ROAD&key=" + apiKey;

        JsonNode response = callApi(url).path("response");
        String status = response.path("status").asText();
        if (!"OK".equals(status)) {
            // 도로명으로 못 찾으면 지번으로 한 번 더 시도
            String fallbackUrl = BASE_URL + "?service=address&request=getcoord&version=2.0&crs=epsg:4326"
                    + "&address=" + encoded + "&type=PARCEL&key=" + apiKey;
            response = callApi(fallbackUrl).path("response");
            status = response.path("status").asText();
            if (!"OK".equals(status)) {
                throw new RuntimeException("주소를 찾을 수 없어요: " + address);
            }
        }

        JsonNode point = response.path("result").path("point");
        double lon = point.path("x").asDouble();
        double lat = point.path("y").asDouble();
        // 주소->좌표 응답엔 행정동 이름이 안 들어있어서, 받은 좌표로 역지오코딩을 한 번 더 태워서
        // 행정동까지 채운 완전한 LocationInfo로 돌려줌 (입력 방식이 주소든 GPS든 결과 형태는 동일하게)
        return reverseGeocode(lat, lon);
    }

    // GPS 위경도 -> 행정동. 역지오코딩으로 위경도를 그대로 가지고 있으니 기상청 격자까지 같이 계산해서 반환
    public LocationInfo reverseGeocode(double lat, double lon) throws Exception {
        String point = URLEncoder.encode(lon + "," + lat, StandardCharsets.UTF_8); // VWorld는 "경도,위도" 순서
        String url = BASE_URL + "?service=address&request=getAddress&version=2.0&crs=epsg:4326"
                + "&point=" + point + "&type=PARCEL&key=" + apiKey;

        JsonNode response = callApi(url).path("response");
        String status = response.path("status").asText();
        if (!"OK".equals(status)) {
            throw new RuntimeException("이 위치의 주소를 찾을 수 없어요.");
        }

        JsonNode first = response.path("result").get(0);
        JsonNode structure = first != null ? first.path("structure") : null;
        String adminDong = extractAdminDong(structure);
        KmaGridConverter.Grid grid = KmaGridConverter.toGrid(lat, lon);
        return new LocationInfo(lat, lon, adminDong, grid.nx(), grid.ny());
    }

    // level4A가 행정동(없는 경우도 있음 - 리 단위 등), 비어있으면 법정동(level4L)으로 대체
    private String extractAdminDong(JsonNode structure) {
        if (structure == null) return null;
        String dong = structure.path("level4A").asText(null);
        if (dong == null || dong.isBlank()) {
            dong = structure.path("level4L").asText(null);
        }
        String gu = structure.path("level2").asText(null); // 시/군/구
        if (dong == null) return gu;
        return gu != null ? gu + " " + dong : dong;
    }

    private JsonNode callApi(String url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(15000);

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            return objectMapper.readTree(body.toString());
        }
    }
}
