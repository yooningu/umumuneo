package com.example.demo.controller;

import com.example.demo.dto.request.InboundEmailRequest;
import com.example.demo.service.InboundEmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Cloudflare Email Routing(Worker)이 호출하는 엔드포인트. 로그인 유저가 아니라 Cloudflare가 호출하는 거라
// JWT 대신 별도의 공유 시크릿(X-Inbound-Secret 헤더)으로만 검증한다.
@Slf4j
@RestController
@RequestMapping("/api/v1/email")
@RequiredArgsConstructor
public class InboundEmailController {

    private final InboundEmailService inboundEmailService;

    @Value("${email.inbound-secret}")
    private String inboundSecret;

    @PostMapping("/inbound")
    public ResponseEntity<Void> inbound(
            @RequestHeader(value = "X-Inbound-Secret", required = false) String secret,
            @Valid @RequestBody InboundEmailRequest request
    ) {
        log.info("이메일 수신 요청 도착: from={}, to={}, secret 일치={}",
                request.getFrom(), request.getTo(), inboundSecret != null && inboundSecret.equals(secret));
        if (inboundSecret == null || inboundSecret.isBlank() || !inboundSecret.equals(secret)) {
            log.warn("이메일 수신 요청 거부됨 - 시크릿 불일치 (받은 값 길이={})", secret == null ? -1 : secret.length());
            return ResponseEntity.status(403).build();
        }
        inboundEmailService.receive(request);
        return ResponseEntity.ok().build();
    }
}
