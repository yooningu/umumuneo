package com.example.demo.controller;

import com.example.demo.dto.request.MailRequest;
import com.example.demo.dto.response.BlockedSenderResponse;
import com.example.demo.dto.response.InboundEmailDetailResponse;
import com.example.demo.dto.response.InboundEmailResponse;
import com.example.demo.service.InboundEmailService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

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

    // GET /api/v1/emails?search=&page=0&size=20 - 내가 받은 메일 목록 (최신순, 20개씩 페이지네이션)
    @GetMapping
    public ResponseEntity<Page<InboundEmailResponse>> getEmails(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(inboundEmailService.getEmailsForUser(userId, search, pageable));
    }

    // GET /api/v1/emails/{id} - 메일 상세 (첨부파일 목록 포함). 조회하면 읽음 처리됨
    @GetMapping("/{id}")
    public ResponseEntity<InboundEmailDetailResponse> getEmail(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(inboundEmailService.getEmailDetail(userId, id));
    }

    // DELETE /api/v1/emails/{id} - 메일 삭제 (첨부파일도 같이 삭제됨)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmail(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        inboundEmailService.deleteEmail(userId, id);
        return ResponseEntity.noContent().build();
    }

    // PATCH /api/v1/emails/{id}/read - 목록에서 직접 읽음/안읽음 전환 (상세를 안 열어도 됨)
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> setRead(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @Valid @RequestBody MailRequest.SetRead request
    ) {
        inboundEmailService.setRead(userId, id, request.getIsRead());
        return ResponseEntity.ok().build();
    }

    // POST /api/v1/emails/block - 보낸사람 주소 차단. 이후 그 주소에서 온 메일은 저장 자체가 안 됨
    @PostMapping("/block")
    public ResponseEntity<Void> blockSender(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody MailRequest.Block request
    ) {
        inboundEmailService.blockSender(userId, request.getAddress());
        return ResponseEntity.ok().build();
    }

    // GET /api/v1/emails/blocked - 설정 > 차단 목록
    @GetMapping("/blocked")
    public ResponseEntity<List<BlockedSenderResponse>> getBlockedSenders(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(inboundEmailService.listBlockedSenders(userId));
    }

    // DELETE /api/v1/emails/blocked/{id} - 차단 해제
    @DeleteMapping("/blocked/{id}")
    public ResponseEntity<Void> unblockSender(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        inboundEmailService.unblockSender(userId, id);
        return ResponseEntity.noContent().build();
    }

    // 첨부파일 다운로드/미리보기는 이제 실제로 NAS 파일(FileEntity)이라서 여기 따로 안 만들고
    // 기존 /api/v1/files/{id}/download, /api/v1/files/{id}/view 를 그대로 쓴다 (FileController).
}
