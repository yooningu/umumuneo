package com.example.demo.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// IP로 대략적인 국가/도시를 조회 - ip-api.com(무료, API 키 불필요, lang=ko로 국가/도시명을
// 한글로 받음)을 씀. 로컬 개발환경의 사설 IP(127.0.0.1, 172.x 등)는 조회가 안 되는 게
// 정상이라, 실패하면 로그인 자체는 계속 진행되게 조용히 null만 반환함
@Slf4j
@Component
@RequiredArgsConstructor
public class GeoLocationClient {

    private final RestTemplate restTemplate;

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
