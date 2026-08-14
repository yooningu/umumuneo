package com.example.demo.dto.response;

import com.example.demo.entity.FileEntity;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class FileResponse {

    private final String id;
    private final String parentId;
    private final String name;
    private final Boolean isDirectory;
    private final Long sizeBytes;
    private final String extension;
    private final String mimeType;
    private final String thumbnailUrl;
    private final Boolean previewable; // true면 /{id}/view 로 브라우저에 바로 보여줄 수 있음 (이미지/영상/PDF)
    private final Boolean isFavorite;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public FileResponse(FileEntity file) {
        this.id = file.getId();
        this.parentId = file.getParent() != null ? file.getParent().getId() : null;
        this.name = file.getName();
        this.isDirectory = file.getIsDirectory();
        // 폴더면 파일 관련 필드 null
        this.sizeBytes = file.getIsDirectory() ? null : file.getSizeBytes();
        this.extension = file.getIsDirectory() ? null : file.getExtension();
        this.mimeType = file.getIsDirectory() ? null : file.getMimeType();
        this.thumbnailUrl = file.getIsDirectory() ? null : file.getThumbnailPath();
        this.previewable = !file.getIsDirectory() && FileEntity.isPreviewable(file.getMimeType());
        this.isFavorite = file.getIsFavorite();
        this.createdAt = file.getCreatedAt();
        this.updatedAt = file.getUpdatedAt();
    }
}
