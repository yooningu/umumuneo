package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

public class AuthResponse {

    @Getter
    @AllArgsConstructor
    public static class Login {
        private String accessToken;
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
}
