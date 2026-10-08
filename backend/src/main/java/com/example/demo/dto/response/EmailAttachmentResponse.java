package com.example.demo.dto.response;

import com.example.demo.entity.EmailAttachment;
import com.example.demo.entity.FileEntity;
import lombok.Getter;

@Getter
public class EmailAttachmentResponse {

    private final String id;
    private final String filename;
    private final String contentType;
    private final Long sizeBytes;
    private final Boolean previewable; // true면 /view 로 브라우저에 바로 보여줄 수 있음 (이미지/영상/PDF)

    public EmailAttachmentResponse(EmailAttachment attachment) {
        this.id = attachment.getId();
        this.filename = attachment.getFilename();
        this.contentType = attachment.getContentType();
        this.sizeBytes = attachment.getSizeBytes();
        this.previewable = FileEntity.isPreviewable(attachment.getContentType());
    }
}
