package com.example.demo.controller;

import com.example.demo.dto.request.AuthRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.service.AuthService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // POST /api/v1/auth/kakao (인증 불필요)
    @PostMapping("/kakao")
    public ResponseEntity<AuthResponse.Login> kakaoLogin(
            @Valid @RequestBody AuthRequest.KakaoLogin request
    ) {
        AuthResponse.Login response = authService.kakaoLogin(request.getCode());
        return ResponseEntity.ok(response);
    }

    // POST /api/v1/auth/refresh (인증 불필요)
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse.TokenRefresh> refresh(
            @Valid @RequestBody AuthRequest.Refresh request
    ) {
        AuthResponse.TokenRefresh response = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    // POST /api/v1/auth/device-token (인증 필요 - 지정된 계정만 발급 가능, 미니피시 음성 비서용)
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/device-token")
    public ResponseEntity<AuthResponse.DeviceToken> generateDeviceToken(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(authService.generateDeviceToken(userId));
    }

    // POST /api/v1/auth/logout (인증 필요)
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal String userId
    ) {
        authService.logout(userId);
        return ResponseEntity.ok().build();
    }
}
