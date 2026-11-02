package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

public class AuthRequest {

    @Getter
    public static class KakaoLogin {
        @NotBlank(message = "인가코드는 필수입니다.")
        private String code;
        // "로그인 상태 유지" 체크 여부 - true면 만료시간 없는 refresh token 발급
        private boolean rememberMe;
    }
}
