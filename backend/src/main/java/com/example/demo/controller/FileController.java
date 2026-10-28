package com.example.demo.controller;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.dto.response.FileResponse;
import com.example.demo.service.FileService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class FileController {

    private final FileService fileService;

    // GET /api/v1/files
    @GetMapping
    public ResponseEntity<List<FileResponse>> getFiles(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String parentId,
            @RequestParam(required = false) Boolean isFavorite,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String source
    ) {
        return ResponseEntity.ok(fileService.getFiles(userId, parentId, isFavorite, search, source));
    }

    // POST /api/v1/files/upload
    @PostMapping("/upload")
    public ResponseEntity<List<FileResponse>> uploadFiles(
            @AuthenticationPrincipal String userId,
            @RequestParam("file") MultipartFile[] files,
            @RequestParam(required = false) String parentId,
            @RequestParam(required = false) String source
    ) throws IOException {
        return ResponseEntity.status(201).body(fileService.uploadFiles(userId, files, parentId, source));
    }

    // ===== 큰 파일 조각 업로드 (Cloudflare 100MB 요청 본문 제한 우회용) =====

    // POST /api/v1/files/upload/init - 조각 업로드 시작, 세션 id 발급
    @PostMapping("/upload/init")
    public ResponseEntity<Map<String, String>> initChunkedUpload(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody FileRequest.InitChunkedUpload request
    ) {
        return ResponseEntity.ok(Map.of("sessionId", fileService.initChunkedUpload(userId, request)));
    }

    // POST /api/v1/files/upload/chunk - 조각 하나 업로드
    @PostMapping("/upload/chunk")
    public ResponseEntity<Void> uploadChunk(
            @AuthenticationPrincipal String userId,
            @RequestParam String sessionId,
            @RequestParam int chunkIndex,
            @RequestParam("chunk") MultipartFile chunk
    ) throws IOException {
        fileService.uploadChunk(userId, sessionId, chunkIndex, chunk);
        return ResponseEntity.ok().build();
    }

    // GET /api/v1/files/upload/{sessionId}/chunks - 지금까지 받은 조각 번호들 (재개 시 중복 전송 방지)
    @GetMapping("/upload/{sessionId}/chunks")
    public ResponseEntity<Set<Integer>> getUploadedChunks(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessionId
    ) throws IOException {
        return ResponseEntity.ok(fileService.getUploadedChunks(userId, sessionId));
    }

    // POST /api/v1/files/upload/complete - 조각이 전부 모이면 하나로 합쳐서 진짜 파일로 만듦
    @PostMapping("/upload/complete")
    public ResponseEntity<FileResponse> completeChunkedUpload(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody FileRequest.SessionId request
    ) throws IOException {
        return ResponseEntity.status(201).body(fileService.completeChunkedUpload(userId, request.getSessionId()));
    }

    // DELETE /api/v1/files/upload/{sessionId} - 업로드 취소, 받아둔 조각들 정리
    @DeleteMapping("/upload/{sessionId}")
    public ResponseEntity<Void> cancelChunkedUpload(
            @AuthenticationPrincipal String userId,
            @PathVariable String sessionId
    ) throws IOException {
        fileService.cancelChunkedUpload(userId, sessionId);
        return ResponseEntity.noContent().build();
    }

    // POST /api/v1/files/directory
    @PostMapping("/directory")
    public ResponseEntity<FileResponse> createDirectory(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody FileRequest.CreateDirectory request
    ) {
        return ResponseEntity.status(201).body(fileService.createDirectory(userId, request));
    }

    // PATCH /api/v1/files/{id}/favorite
    @PatchMapping("/{id}/favorite")
    public ResponseEntity<Void> toggleFavorite(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        fileService.toggleFavorite(userId, id);
        return ResponseEntity.ok().build();
    }

    // PATCH /api/v1/files/{id}
    @PatchMapping("/{id}")
    public ResponseEntity<Void> rename(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @Valid @RequestBody FileRequest.Rename request
    ) {
        fileService.rename(userId, id, request);
        return ResponseEntity.ok().build();
    }

    // PATCH /api/v1/files/{id}/move (다른 폴더로 이동 - 드래그앤드롭)
    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> move(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @RequestBody FileRequest.Move request
    ) {
        fileService.move(userId, id, request);
        return ResponseEntity.ok().build();
    }

    // GET /api/v1/files/{id}/download (항상 다운로드 - 브라우저가 열지 않고 저장함)
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) throws IOException {
        FileService.ShareableFile file = fileService.downloadFile(userId, id);
        String encodedName = URLEncoder.encode(file.filename(), StandardCharsets.UTF_8);
        MediaType mediaType = file.mimeType() != null
                ? MediaType.parseMediaType(file.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedName + "\"")
                .contentType(mediaType)
                .body(file.resource());
    }

    // GET /api/v1/files/{id}/view (이미지/영상/PDF 브라우저 미리보기용 - inline로 열고, 영상 탐색(seek)을 위해 Range 요청 지원)
    @GetMapping("/{id}/view")
    public ResponseEntity<ResourceRegion> viewFile(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @RequestHeader HttpHeaders headers
    ) throws IOException {
        FileService.ShareableFile file = fileService.getPreviewFile(userId, id);
        Resource resource = file.resource();
        long contentLength = resource.contentLength();
        MediaType mediaType = file.mimeType() != null
                ? MediaType.parseMediaType(file.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;
        String encodedName = URLEncoder.encode(file.filename(), StandardCharsets.UTF_8);

        List<HttpRange> ranges = headers.getRange();
        ResourceRegion region = ranges.isEmpty()
                ? new ResourceRegion(resource, 0, contentLength)
                : ranges.get(0).toResourceRegion(resource);

        return ResponseEntity.status(ranges.isEmpty() ? HttpStatus.OK : HttpStatus.PARTIAL_CONTENT)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + encodedName + "\"")
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .contentType(mediaType)
                .body(region);
    }

    // DELETE /api/v1/files/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) throws IOException {
        fileService.deleteFile(userId, id);
        return ResponseEntity.noContent().build();
    }
}
