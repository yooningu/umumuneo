package com.example.demo.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

public class AuthResponse {

    @Getter
    @AllArgsConstructor
    public static class Login {
        private String accessToken;
        // 응답 바디로는 절대 안 내려감(HttpOnly 쿠키로만 전달) - 컨트롤러가 쿠키를 만들 때만 씀
        @JsonIgnore
        private String refreshToken;
        private boolean talkMessageAgreed;  // 카카오톡 메시지 동의 여부
        private String agreementUrl;        // 동의 안 했을 때 동의 URL (동의 했으면 null)
        private List<String> agreedScopes;  // 사용자가 동의한 스코프 목록
    }

    @Getter
    @AllArgsConstructor
    public static class TokenRefresh {
        private String accessToken;
    }

    @Getter
    @AllArgsConstructor
    public static class DeviceToken {
        private String deviceToken;
    }

    // 설정 > 로그인된 기기 목록에 보여줄 세션 하나.
    // isCurrent는 Boolean(래퍼) 타입으로 둠 - primitive boolean이면 Lombok이 isCurrent()를 만들고
    // Jackson이 "is" 접두사를 떼어 JSON 키가 "current"가 돼버려서 프론트 필드명이랑 어긋남
    @Getter
    @AllArgsConstructor
    public static class SessionInfo {
        private String id;
        private String deviceLabel;
        private Boolean rememberMe;
        private LocalDateTime createdAt;
        private LocalDateTime lastUsedAt;
        private Boolean isCurrent;
    }
}
