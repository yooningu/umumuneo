package com.example.demo.controller;

import com.example.demo.dto.request.MemoRequest;
import com.example.demo.dto.response.MemoResponse;
import com.example.demo.service.MemoService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/memo")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class MemoController {

    private final MemoService memoService;

    // GET /api/v1/memo
    @GetMapping
    public ResponseEntity<MemoResponse> getMemo(@AuthenticationPrincipal String userId) {
        return ResponseEntity.ok(memoService.getMemo(userId));
    }

    // PUT /api/v1/memo - 저장 버튼 없이, 프론트에서 디바운스해서 호출하는 자동 저장용
    @PutMapping
    public ResponseEntity<Void> updateMemo(
            @AuthenticationPrincipal String userId,
            @RequestBody MemoRequest request
    ) {
        memoService.updateMemo(userId, request.getContent());
        return ResponseEntity.ok().build();
    }
}
