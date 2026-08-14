package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

public class AuthRequest {

    @Getter
    public static class KakaoLogin {
        @NotBlank(message = "인가코드는 필수입니다.")
        private String code;
    }

    @Getter
    public static class Refresh {
        @NotBlank(message = "Refresh Token은 필수입니다.")
        private String refreshToken;
    }
}
