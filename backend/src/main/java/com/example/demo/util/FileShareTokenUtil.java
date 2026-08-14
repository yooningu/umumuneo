package com.example.demo.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

// 카카오 등 외부 서버가 로그인 없이 특정 파일 하나에만 잠깐 접근할 수 있게 해주는 단기 서명 토큰.
// 일반 로그인 JWT와는 별개 용도(purpose 클레임으로 구분)이며, 파일 ID 하나만 담고 만료시간이 짧음.
@Component
public class FileShareTokenUtil {

    private static final long EXPIRATION_MS = 15 * 60 * 1000L; // 15분
    private static final String PURPOSE = "file-share";

    private final SecretKey secretKey;

    public FileShareTokenUtil(@Value("${jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // fileId에 대한 15분짜리 공개 접근 토큰 발급
    public String generateToken(String fileId) {
        return Jwts.builder()
                .subject(fileId)
                .claim("purpose", PURPOSE)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(secretKey)
                .compact();
    }

    // 토큰 검증 후 fileId 반환 (만료/위조/용도 불일치 시 예외)
    public String verifyAndGetFileId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        if (!PURPOSE.equals(claims.get("purpose", String.class))) {
            throw new RuntimeException("유효하지 않은 공유 링크입니다.");
        }
        return claims.getSubject();
    }
}
