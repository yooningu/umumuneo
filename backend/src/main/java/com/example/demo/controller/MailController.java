package com.example.demo.controller;

import com.example.demo.dto.response.InboundEmailDetailResponse;
import com.example.demo.dto.response.InboundEmailResponse;
import com.example.demo.entity.FileEntity;
import com.example.demo.service.FileService;
import com.example.demo.service.InboundEmailService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

// 로그인한 유저 본인이 받은 메일(umumuneo.com으로 온 것) 조회용.
// 메일이 실제로 들어오는 경로(Cloudflare Worker -> 공유 시크릿)는 InboundEmailController(/api/v1/email/inbound)가 따로 담당함 -
// 경로를 분리해둔 이유는 JwtFilter의 공개 경로 목록이 startsWith로 매칭돼서, 같은 접두사를 쓰면
// 이 컨트롤러의 인증이 필요한 엔드포인트까지 실수로 인증 없이 뚫려버리기 때문.
@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class MailController {

    private final InboundEmailService inboundEmailService;

    // GET /api/v1/emails - 내가 받은 메일 목록 (최신순)
    @GetMapping
    public ResponseEntity<List<InboundEmailResponse>> getEmails(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(inboundEmailService.getEmailsForUser(userId));
    }

    // GET /api/v1/emails/{id} - 메일 상세 (첨부파일 목록 포함)
    @GetMapping("/{id}")
    public ResponseEntity<InboundEmailDetailResponse> getEmail(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(inboundEmailService.getEmailDetail(userId, id));
    }

    // GET /api/v1/emails/{id}/attachments/{attachmentId}/download - 항상 다운로드
    @GetMapping("/{id}/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @PathVariable String attachmentId
    ) throws IOException {
        FileService.ShareableFile file = inboundEmailService.getOwnedAttachment(userId, id, attachmentId);
        String encodedName = URLEncoder.encode(file.filename(), StandardCharsets.UTF_8);
        MediaType mediaType = file.mimeType() != null
                ? MediaType.parseMediaType(file.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedName + "\"")
                .contentType(mediaType)
                .body(file.resource());
    }

    // GET /api/v1/emails/{id}/attachments/{attachmentId}/view - 이미지/영상/PDF 브라우저 미리보기용
    @GetMapping("/{id}/attachments/{attachmentId}/view")
    public ResponseEntity<Resource> viewAttachment(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @PathVariable String attachmentId
    ) throws IOException {
        FileService.ShareableFile file = inboundEmailService.getOwnedAttachment(userId, id, attachmentId);
        if (!FileEntity.isPreviewable(file.mimeType())) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
        }
        String encodedName = URLEncoder.encode(file.filename(), StandardCharsets.UTF_8);
        MediaType mediaType = file.mimeType() != null
                ? MediaType.parseMediaType(file.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + encodedName + "\"")
                .contentType(mediaType)
                .body(file.resource());
    }
}
