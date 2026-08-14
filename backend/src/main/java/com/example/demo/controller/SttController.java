package com.example.demo.controller;

import com.example.demo.service.SttService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/stt")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class SttController {

    private final SttService sttService;

    // POST /api/v1/stt/transcribe (multipart: audio 파일 + 선택적 language)
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> transcribe(
            @AuthenticationPrincipal String userId,
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(required = false) String language
    ) {
        return ResponseEntity.ok(sttService.transcribe(audio, language));
    }
}
