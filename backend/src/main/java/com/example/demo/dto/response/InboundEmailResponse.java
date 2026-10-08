package com.example.demo.dto.response;

import com.example.demo.entity.InboundEmail;
import lombok.Getter;

import java.time.LocalDateTime;

// 메일 목록용 (본문 미리보기만, 첨부파일은 개수만)
@Getter
public class InboundEmailResponse {

    private static final int PREVIEW_LENGTH = 120;

    private final String id;
    private final String fromAddress;
    private final String subject;
    private final String bodyPreview;
    private final int attachmentCount;
    private final LocalDateTime receivedAt;

    public InboundEmailResponse(InboundEmail email) {
        this.id = email.getId();
        this.fromAddress = email.getFromAddress();
        this.subject = email.getSubject();
        String body = email.getBody();
        this.bodyPreview = body == null ? "" :
                (body.length() > PREVIEW_LENGTH ? body.substring(0, PREVIEW_LENGTH) + "…" : body);
        this.attachmentCount = email.getAttachments().size();
        this.receivedAt = email.getReceivedAt();
    }
}
