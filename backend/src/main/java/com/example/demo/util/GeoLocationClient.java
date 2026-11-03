package com.example.demo.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// IP로 대략적인 국가/도시를 조회 - ip-api.com(무료, API 키 불필요, lang=ko로 국가/도시명을
// 한글로 받음)을 씀. 로컬 개발환경의 사설 IP(127.0.0.1, 172.x 등)는 조회가 안 되는 게
// 정상이라, 실패하면 로그인 자체는 계속 진행되게 조용히 null만 반환함.
// 다른 외부 API(카카오/OCR/STT)와 공유하는 RestTemplate 빈을 안 쓰고 짧은 타임아웃을 가진
// 전용 RestTemplate을 따로 둠 - ip-api.com이 느려지거나 응답이 없을 때 요청 스레드가
// 무한정 붙잡혀서 서버 전체가 느려지는 걸 막기 위함
@Slf4j
@Component
public class GeoLocationClient {

    private final RestTemplate restTemplate;

    public GeoLocationClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(1500);
        factory.setReadTimeout(2000);
        this.restTemplate = new RestTemplate(factory);
    }

    public record GeoLocation(String country, String city) {}

    public GeoLocation lookup(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return null;
        try {
            Map<String, Object> body = restTemplate.getForObject(
                    "http://ip-api.com/json/{ip}?fields=status,country,city&lang=ko",
                    Map.class,
                    ipAddress
            );
            if (body == null || !"success".equals(body.get("status"))) return null;
            return new GeoLocation((String) body.get("country"), (String) body.get("city"));
        } catch (Exception e) {
            log.warn("IP 위치 조회 실패: {}", e.getMessage());
            return null;
        }
    }
}
