package com.example.demo.service;

import com.example.demo.dto.request.InboundEmailRequest;
import com.example.demo.entity.InboundEmail;
import com.example.demo.entity.User;
import com.example.demo.repository.InboundEmailRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// umumuneo.com으로 온 메일을 받아서 DB에 저장하고, 받는 주소(별칭)로 유저를 찾아 그 유저에게만
// 카카오톡 "나에게 보내기"로 즉시 알림을 보낸다.
// (Cloudflare Email Routing이 메일을 받아서 Worker를 통해 이 서비스의 컨트롤러로 전달해줌)
@Slf4j
@Service
@RequiredArgsConstructor
public class InboundEmailService {

    private final InboundEmailRepository inboundEmailRepository;
    private final UserRepository userRepository;
    private final KakaoNotificationService kakaoNotificationService;

    @Transactional
    public void receive(InboundEmailRequest request) {
        // 받는 주소(예: abc123@umumuneo.com)에서 @ 앞부분만 떼서 유저 별칭과 매칭
        User recipient = null;
        if (request.getTo() != null && request.getTo().contains("@")) {
            String alias = request.getTo().substring(0, request.getTo().indexOf('@')).trim().toLowerCase();
            recipient = userRepository.findByEmailAlias(alias).orElse(null);
        }

        InboundEmail email = new InboundEmail();
        email.setFromAddress(request.getFrom());
        email.setSubject(request.getSubject());
        email.setBody(request.getBody());
        email.setUser(recipient);
        inboundEmailRepository.save(email);

        if (recipient == null) {
            log.warn("받는 주소({})와 매칭되는 유저가 없어 알림을 보내지 않음", request.getTo());
            return;
        }

        // 알림 발송은 부가 기능이라, 실패해도 메일 저장 자체는 이미 끝난 상태 유지
        try {
            String subject = request.getSubject() != null && !request.getSubject().isBlank()
                    ? request.getSubject() : "(제목 없음)";
            String text = "📧 새 메일 도착\n보낸사람: " + request.getFrom() + "\n제목: " + subject;
            kakaoNotificationService.sendText(recipient, text);
        } catch (Exception e) {
            log.warn("메일 도착 알림 발송 실패: {}", e.getMessage());
        }
    }
}
