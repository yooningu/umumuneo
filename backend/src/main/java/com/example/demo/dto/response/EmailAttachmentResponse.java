package com.example.demo.dto.response;

import com.example.demo.entity.FileEntity;
import lombok.Getter;

// 메일 상세 화면의 첨부파일 하나 - 이제 실체는 FileEntity(NAS가 쓰는 files 테이블, source=EMAIL)라서
// 그걸 메일 쪽 필드 이름(filename/contentType)으로 감싸주기만 한다. id는 FileEntity의 id라서
// /api/v1/files/{id}/download, /view 를 NAS 파일과 똑같이 그대로 쓸 수 있다.
@Getter
public class EmailAttachmentResponse {

    private final String id;
    private final String filename;
    private final String contentType;
    private final Long sizeBytes;
    private final Boolean previewable; // true면 /view 로 브라우저에 바로 보여줄 수 있음 (이미지/영상/PDF)

    public EmailAttachmentResponse(FileEntity file) {
        this.id = file.getId();
        this.filename = file.getName();
        this.contentType = file.getMimeType();
        this.sizeBytes = file.getSizeBytes();
        this.previewable = FileEntity.isPreviewable(file.getMimeType());
    }
}
