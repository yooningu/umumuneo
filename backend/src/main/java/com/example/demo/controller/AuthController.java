package com.example.demo.controller;

import com.example.demo.dto.request.AuthRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.service.AuthService;
import com.example.demo.util.JwtUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    // POST /api/v1/auth/kakao (인증 불필요)
    @PostMapping("/kakao")
    public ResponseEntity<AuthResponse.Login> kakaoLogin(
            @Valid @RequestBody AuthRequest.KakaoLogin request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent
    ) {
        AuthResponse.Login response = authService.kakaoLogin(request.getCode(), request.isRememberMe(), userAgent);
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

    // POST /api/v1/auth/logout (인증 필요) - 지금 로그인한 기기 하나만 로그아웃
    @SecurityRequirement(name = "Bearer Authentication")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        authService.logout(userId, extractSessionId(authHeader));
        return ResponseEntity.ok().build();
    }

    // GET /api/v1/auth/sessions (인증 필요) - 설정 > 로그인된 기기 목록
    @SecurityRequirement(name = "Bearer Authentication")
    @GetMapping("/sessions")
    public ResponseEntity<List<AuthResponse.SessionInfo>> listSessions(
            @AuthenticationPrincipal String userId,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        return ResponseEntity.ok(authService.listSessions(userId, extractSessionId(authHeader)));
    }

    // DELETE /api/v1/auth/sessions/{sessionId} (인증 필요) - 특정 기기 하나만 원격 로그아웃
    @SecurityRequirement(name = "Bearer Authentication")
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessionId
    ) {
        authService.revokeSession(userId, sessionId);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/v1/auth/sessions (인증 필요) - 모든 기기에서 로그아웃(지금 기기 포함)
    @SecurityRequirement(name = "Bearer Authentication")
    @DeleteMapping("/sessions")
    public ResponseEntity<Void> revokeAllSessions(
            @AuthenticationPrincipal String userId
    ) {
        authService.revokeAllSessions(userId);
        return ResponseEntity.ok().build();
    }

    // Authorization 헤더의 access token에서 세션 id(jti) 추출. 토큰이 없거나 이상해도
    // 그냥 null로 취급(목록에서 "현재 기기" 표시만 안 될 뿐 전체가 실패하진 않게)
    private String extractSessionId(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            return jwtUtil.getSessionId(authHeader.substring(7));
        } catch (Exception e) {
            return null;
        }
    }
}
