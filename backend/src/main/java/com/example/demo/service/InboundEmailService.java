package com.example.demo.service;

import com.example.demo.dto.request.EmailAttachmentRequest;
import com.example.demo.dto.request.InboundEmailRequest;
import com.example.demo.dto.response.InboundEmailDetailResponse;
import com.example.demo.dto.response.InboundEmailResponse;
import com.example.demo.entity.EmailAttachment;
import com.example.demo.entity.InboundEmail;
import com.example.demo.entity.User;
import com.example.demo.repository.EmailAttachmentRepository;
import com.example.demo.repository.InboundEmailRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.EmailAttachmentShareTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

// umumuneo.com으로 온 메일을 받아서 DB에 저장하고, 받는 주소(별칭)로 유저를 찾아 그 유저에게만
// 카카오톡 "나에게 보내기"로 즉시 알림을 보낸다 (첨부파일이 있으면 15분짜리 공개 링크도 같이 보냄).
// (Cloudflare Email Routing이 메일을 받아서 Worker를 통해 이 서비스의 컨트롤러로 전달해줌)
@Slf4j
@Service
@RequiredArgsConstructor
public class InboundEmailService {

    // 첨부파일 1개당 이 크기(디코딩 후 바이트 기준)를 넘으면 저장하지 않고 건너뜀.
    // Worker 쪽에서도 한 번 거르지만, 백엔드에서도 방어적으로 한 번 더 확인함.
    private static final long MAX_ATTACHMENT_BYTES = 25L * 1024 * 1024; // 25MB

    private final InboundEmailRepository inboundEmailRepository;
    private final EmailAttachmentRepository emailAttachmentRepository;
    private final UserRepository userRepository;
    private final KakaoNotificationService kakaoNotificationService;
    private final EmailAttachmentShareTokenUtil emailAttachmentShareTokenUtil;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Value("${app.public-base-url}")
    private String publicBaseUrl;

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
        email.setBodyHtml(request.getBodyHtml());
        email.setUser(recipient);
        inboundEmailRepository.save(email); // 여기서 email.getId()가 채워짐 (UuidGenerator)

        List<EmailAttachment> savedAttachments = saveAttachments(email, request.getAttachments());

        if (recipient == null) {
            log.warn("받는 주소({})와 매칭되는 유저가 없어 알림을 보내지 않음", request.getTo());
            return;
        }

        // 알림 발송은 부가 기능이라, 실패해도 메일 저장 자체는 이미 끝난 상태 유지
        try {
            String subject = request.getSubject() != null && !request.getSubject().isBlank()
                    ? request.getSubject() : "(제목 없음)";
            StringBuilder text = new StringBuilder("📧 새 메일 도착\n보낸사람: " + request.getFrom() + "\n제목: " + subject);

            for (EmailAttachment attachment : savedAttachments) {
                String publicUrl = buildAttachmentPublicUrl(attachment.getId());
                text.append("\n📎 ").append(attachment.getFilename()).append("\n").append(publicUrl);
            }
            if (!savedAttachments.isEmpty()) {
                text.append("\n(링크는 15분 동안만 유효해요)");
            }

            kakaoNotificationService.sendText(recipient, text.toString());
        } catch (Exception e) {
            log.warn("메일 도착 알림 발송 실패: {}", e.getMessage());
        }
    }

    // 첨부파일들을 디스크에 저장하고 EmailAttachment로 기록
    private List<EmailAttachment> saveAttachments(InboundEmail email, List<EmailAttachmentRequest> attachmentRequests) {
        if (attachmentRequests == null || attachmentRequests.isEmpty()) {
            return List.of();
        }

        try {
            Path emailDir = Paths.get(uploadDir, "email-attachments", email.getId());
            Files.createDirectories(emailDir);

            return attachmentRequests.stream()
                    .map(req -> saveOneAttachment(email, emailDir, req))
                    .filter(java.util.Objects::nonNull)
                    .toList();
        } catch (IOException e) {
            log.error("첨부파일 저장 디렉토리 생성 실패", e);
            return List.of();
        }
    }

    private EmailAttachment saveOneAttachment(InboundEmail email, Path emailDir, EmailAttachmentRequest req) {
        if (req.getDataBase64() == null || req.getDataBase64().isBlank()) {
            return null;
        }
        try {
            byte[] data = Base64.getDecoder().decode(req.getDataBase64());
            if (data.length > MAX_ATTACHMENT_BYTES) {
                log.warn("첨부파일 '{}' 용량 초과({})로 저장하지 않음", req.getFilename(), data.length);
                return null;
            }

            String safeFilename = sanitizeFilename(req.getFilename());
            String storedName = UUID.randomUUID() + "_" + safeFilename;
            Path target = emailDir.resolve(storedName);
            Files.write(target, data);

            EmailAttachment attachment = new EmailAttachment();
            attachment.setInboundEmail(email);
            attachment.setFilename(safeFilename);
            attachment.setContentType(req.getContentType());
            attachment.setSizeBytes((long) data.length);
            attachment.setStoragePath(target.toString());
            return emailAttachmentRepository.save(attachment);
        } catch (IllegalArgumentException e) {
            log.warn("첨부파일 '{}' base64 디코딩 실패: {}", req.getFilename(), e.getMessage());
            return null;
        } catch (IOException e) {
            log.error("첨부파일 '{}' 저장 실패", req.getFilename(), e);
            return null;
        }
    }

    // 경로 조작 방지 - 디렉토리 구분자 등을 제거하고 파일명만 남김
    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "attachment";
        }
        String name = Paths.get(filename).getFileName().toString();
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private String buildAttachmentPublicUrl(String attachmentId) {
        String token = emailAttachmentShareTokenUtil.generateToken(attachmentId);
        return publicBaseUrl + "/public/email-attachments/" + token;
    }

    // 로그인한 유저 본인의 메일 목록 (최신순)
    @Transactional(readOnly = true)
    public List<InboundEmailResponse> getEmailsForUser(String userId) {
        return inboundEmailRepository.findByUserIdOrderByReceivedAtDesc(userId).stream()
                .map(InboundEmailResponse::new)
                .toList();
    }

    // 메일 상세 (첨부파일 목록 포함) - 본인 것만 조회 가능
    @Transactional(readOnly = true)
    public InboundEmailDetailResponse getEmailDetail(String userId, String emailId) {
        InboundEmail email = findOwnedEmail(userId, emailId);
        return new InboundEmailDetailResponse(email);
    }

    // 첨부파일 다운로드/미리보기 (로그인 유저, 본인 메일의 첨부파일만)
    @Transactional(readOnly = true)
    public FileService.ShareableFile getOwnedAttachment(String userId, String emailId, String attachmentId) throws MalformedURLException {
        InboundEmail email = findOwnedEmail(userId, emailId);
        EmailAttachment attachment = email.getAttachments().stream()
                .filter(a -> a.getId().equals(attachmentId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("첨부파일을 찾을 수 없습니다."));
        return toShareableFile(attachment);
    }

    // 공개 링크(토큰)를 통한 첨부파일 접근 - 토큰 검증은 호출부(PublicEmailAttachmentController)에서 이미 끝난 상태
    @Transactional(readOnly = true)
    public FileService.ShareableFile getAttachmentById(String attachmentId) throws MalformedURLException {
        EmailAttachment attachment = emailAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("첨부파일을 찾을 수 없습니다."));
        return toShareableFile(attachment);
    }

    private FileService.ShareableFile toShareableFile(EmailAttachment attachment) throws MalformedURLException {
        Path filePath = Paths.get(attachment.getStoragePath());
        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists()) {
            throw new RuntimeException("파일을 찾을 수 없습니다.");
        }
        return new FileService.ShareableFile(resource, attachment.getContentType(), attachment.getFilename());
    }

    private InboundEmail findOwnedEmail(String userId, String emailId) {
        return inboundEmailRepository.findByIdAndUserId(emailId, userId)
                .orElseThrow(() -> new RuntimeException("메일을 찾을 수 없습니다."));
    }
}
