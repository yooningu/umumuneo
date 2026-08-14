package com.example.demo.util;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class KakaoClient {

    @Value("${kakao.client-id}")
    private String clientId;

    @Value("${kakao.redirect-uri}")
    private String redirectUri;

    private final RestTemplate restTemplate;

    // 인가코드 → 카카오 토큰 발급 (access_token, refresh_token 포함)
    public Map<String, Object> getTokens(String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("client_id", clientId);
        body.add("redirect_uri", redirectUri);
        body.add("code", code);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://kauth.kakao.com/oauth/token",
                request,
                Map.class
        );

        return response.getBody();
    }

    public String getAccessToken(String code) {
        Map<String, Object> tokens = getTokens(code);
        return tokens != null ? (String) tokens.get("access_token") : null;
    }

    // 카카오 액세스 토큰 → 사용자 정보 조회
    public Map<String, Object> getUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "https://kapi.kakao.com/v2/user/me",
                HttpMethod.GET,
                request,
                Map.class
        );

        return response.getBody();
    }

    // talk_message 동의 여부 확인 (/v2/user/scopes 호출)
    public boolean hasTalkMessageScope(String accessToken) {
        return getAgreedScopes(accessToken).contains("talk_message");
    }

    // 사용자가 동의한 스코프 ID 목록 반환
    public List<String> getAgreedScopes(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    "https://kapi.kakao.com/v2/user/scopes",
                    HttpMethod.GET,
                    request,
                    Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null) return List.of();

            List<Map<String, Object>> scopes = (List<Map<String, Object>>) body.get("scopes");
            if (scopes == null || scopes.isEmpty()) return List.of();

            return scopes.stream()
                    .filter(scope -> Boolean.TRUE.equals(scope.get("agreed")))
                    .map(scope -> (String) scope.get("id"))
                    .toList();
        } catch (Exception e) {
            System.out.println("getAgreedScopes 오류: " + e.getMessage());
            return List.of();
        }
    }
}

