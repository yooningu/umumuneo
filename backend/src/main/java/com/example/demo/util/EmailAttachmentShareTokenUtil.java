package com.example.demo.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

// 카카오 등 외부 서버가 로그인 없이 메일 첨부파일 하나에만 잠깐 접근할 수 있게 해주는 단기 서명 토큰.
// FileShareTokenUtil과 같은 구조이되, 대상이 FileEntity가 아니라 EmailAttachment라 용도(purpose)를 다르게 둠.
@Component
public class EmailAttachmentShareTokenUtil {

    private static final long EXPIRATION_MS = 15 * 60 * 1000L; // 15분
    private static final String PURPOSE = "email-attachment-share";

    private final SecretKey secretKey;

    public EmailAttachmentShareTokenUtil(@Value("${jwt.secret}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // 첨부파일 id에 대한 15분짜리 공개 접근 토큰 발급
    public String generateToken(String attachmentId) {
        return Jwts.builder()
                .subject(attachmentId)
                .claim("purpose", PURPOSE)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(secretKey)
                .compact();
    }

    // 토큰 검증 후 attachmentId 반환 (만료/위조/용도 불일치 시 예외)
    public String verifyAndGetAttachmentId(String token) {
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
