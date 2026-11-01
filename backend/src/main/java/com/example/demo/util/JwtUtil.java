package com.example.demo.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration}") long accessTokenExpiration,
            @Value("${jwt.refresh-token-expiration}") long refreshTokenExpiration
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    // Access Token 생성. sessionId(jti)는 로그인 세션(기기) 하나를 가리킴 - access token 자체는
    // 계속 무상태(세션이 끊겨도 자기 만료시간까지는 유효)지만, 어느 기기에서 온 요청인지
    // ("이 기기" 표시) 구분하는 용도로 심어둠
    public String generateAccessToken(String userId, String sessionId) {
        return Jwts.builder()
                .subject(userId)
                .claim("type", "access")
                .id(sessionId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    // Refresh Token 생성. sessionId(jti)가 LoginSession 행의 id와 같아서,
    // /auth/refresh 때마다 그 행이 아직 있는지로 유효성을 확인함 (행을 지우면 즉시 무효화됨)
    public String generateRefreshToken(String userId, String sessionId) {
        return Jwts.builder()
                .subject(userId)
                .claim("type", "refresh")
                .id(sessionId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    // "로그인 상태 유지" 체크했을 때 발급하는 Refresh Token - 만료시간 없이 발급(=로그아웃 전까지 계속 로그인 유지).
    // type은 그대로 "refresh"라 /auth/refresh에서 보통 refresh token이랑 똑같이 처리됨
    public String generatePersistentRefreshToken(String userId, String sessionId) {
        return Jwts.builder()
                .subject(userId)
                .claim("type", "refresh")
                .id(sessionId)
                .issuedAt(new Date())
                .signWith(secretKey)
                .compact();
    }

    // 미니피시(음성 비서)처럼 사람이 계속 로그인해줄 수 없는 기기용 - 만료시간 없이 발급.
    // access/refresh 토큰이랑은 완전히 별개 발급 경로라 기존 로그인 흐름엔 영향 없음.
    // (누가 호출해도 되는 게 아니라 AuthService에서 특정 계정으로만 제한해서 씀)
    public String generateDeviceToken(String userId) {
        return Jwts.builder()
                .subject(userId)
                .claim("type", "device")
                .issuedAt(new Date())
                .signWith(secretKey)
                .compact();
    }

    // 토큰에서 userId 추출
    public String getUserId(String token) {
        return getClaims(token).getSubject();
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // 토큰 타입 확인 (access / refresh)
    public String getTokenType(String token) {
        return getClaims(token).get("type", String.class);
    }

    // 토큰에 심어진 세션 id(jti) 추출 - 이 변경 전에 발급된 토큰엔 없어서 null일 수 있음
    public String getSessionId(String token) {
        return getClaims(token).getId();
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
