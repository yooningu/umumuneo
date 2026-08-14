package com.example.demo.controller;

import com.example.demo.service.FileService;
import com.example.demo.util.FileShareTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// 인증 토큰 없이 접근 가능한 공개 엔드포인트 (카카오 등 외부 서버용). JwtFilter의 PUBLIC_PATHS에도 등록되어 있음.
// 파일 ID를 직접 노출하지 않고, 짧은 시간만 유효한 서명된 토큰으로만 접근 가능하다.
@RestController
@RequestMapping("/public/files")
@RequiredArgsConstructor
public class PublicFileController {

    private final FileService fileService;
    private final FileShareTokenUtil fileShareTokenUtil;

    @GetMapping("/{token}")
    public ResponseEntity<org.springframework.core.io.Resource> download(@PathVariable String token) throws IOException {
        String fileId = fileShareTokenUtil.verifyAndGetFileId(token);
        FileService.ShareableFile file = fileService.downloadFileById(fileId);

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
