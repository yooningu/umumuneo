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
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(fileService.getFiles(userId, parentId, isFavorite, search));
    }

    // POST /api/v1/files/upload
    @PostMapping("/upload")
    public ResponseEntity<List<FileResponse>> uploadFiles(
            @AuthenticationPrincipal String userId,
            @RequestParam("file") MultipartFile[] files,
            @RequestParam(required = false) String parentId
    ) throws IOException {
        return ResponseEntity.status(201).body(fileService.uploadFiles(userId, files, parentId));
    }

    // POST /api/v1/files/directory
    @PostMapping("/directory")
    public ResponseEntity<Void> createDirectory(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody FileRequest.CreateDirectory request
    ) {
        fileService.createDirectory(userId, request);
        return ResponseEntity.status(201).build();
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
