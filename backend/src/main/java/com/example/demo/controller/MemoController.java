package com.example.demo.controller;

import com.example.demo.dto.request.MemoRequest;
import com.example.demo.dto.response.MemoResponse;
import com.example.demo.service.MemoService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/memo")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class MemoController {

    private final MemoService memoService;

    // GET /api/v1/memo - 탭으로 보여줄 메모 목록(만든 순서)
    @GetMapping
    public ResponseEntity<List<MemoResponse>> getMemos(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(memoService.getMemos(userId));
    }

    // POST /api/v1/memo - 새 탭(빈 메모) 추가
    @PostMapping
    public ResponseEntity<MemoResponse> createMemo(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(memoService.createMemo(userId));
    }

    // PUT /api/v1/memo/{memoId} - 저장 버튼 없이, 프론트에서 디바운스해서 호출하는 자동 저장용
    @PutMapping("/{memoId}")
    public ResponseEntity<Void> updateMemo(
            @AuthenticationPrincipal String userId,
            @PathVariable String memoId,
            @RequestBody MemoRequest request
    ) {
        memoService.updateMemo(userId, memoId, request.getContent());
        return ResponseEntity.ok().build();
    }

    // DELETE /api/v1/memo/{memoId} - 탭 닫기
    @DeleteMapping("/{memoId}")
    public ResponseEntity<Void> deleteMemo(
            @AuthenticationPrincipal String userId,
            @PathVariable String memoId
    ) {
        memoService.deleteMemo(userId, memoId);
        return ResponseEntity.ok().build();
    }
}
