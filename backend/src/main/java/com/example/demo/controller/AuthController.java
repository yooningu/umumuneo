package com.example.demo.controller;

import com.example.demo.dto.request.AuthRequest;
import com.example.demo.dto.response.AuthResponse;
import com.example.demo.exception.InvalidRefreshTokenException;
import com.example.demo.service.AuthService;
import com.example.demo.util.JwtUtil;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE_NAME = "refreshToken";
    // 쿠키 Max-Age는 브라우저가 400일로 상한을 두므로("로그인 상태 유지") 그만큼 길게,
    // 평소엔 jwt.refresh-token-expiration(7일)과 맞춤
    private static final Duration PERSISTENT_COOKIE_MAX_AGE = Duration.ofDays(400);

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpirationMs;

    // POST /api/v1/auth/kakao (인증 불필요) - refresh token은 응답 바디가 아니라 HttpOnly 쿠키로만 내려줌
    // (localStorage는 브라우저가 저장공간 부족 시 임의로 비울 수 있어서 로그인 유지가 불안정했음)
    @PostMapping("/kakao")
    public ResponseEntity<AuthResponse.Login> kakaoLogin(
            @Valid @RequestBody AuthRequest.KakaoLogin request,
            @RequestHeader(value = "User-Agent", required = false) String userAgent
    ) {
        AuthResponse.Login response = authService.kakaoLogin(request.getCode(), request.isRememberMe(), userAgent);
        Duration maxAge = request.isRememberMe()
                ? PERSISTENT_COOKIE_MAX_AGE
                : Duration.ofMillis(refreshTokenExpirationMs);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(response.getRefreshToken(), maxAge).toString())
                .body(response);
    }

    // POST /api/v1/auth/refresh (인증 불필요) - refresh token을 쿠키에서 읽음
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse.TokenRefresh> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken
    ) {
        if (refreshToken == null) {
            throw new InvalidRefreshTokenException("Refresh Token이 없습니다.");
        }
        AuthResponse.TokenRefresh response = authService.refresh(refreshToken);
        return ResponseEntity.ok(response);
    }

    private ResponseCookie buildRefreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
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
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie("", Duration.ZERO).toString())
                .build();
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
