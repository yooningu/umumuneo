package com.example.demo.dto.response;

import com.example.demo.repository.InboundEmailListProjection;
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

    // DB에서 이미 PREVIEW_LENGTH+1자로 잘라서 가져온 프로젝션 기준 - 본문 전체/첨부파일 컬렉션은 안 건드림
    public InboundEmailResponse(InboundEmailListProjection p) {
        this.id = p.getId();
        this.fromAddress = p.getFromAddress();
        this.subject = p.getSubject();
        String body = p.getBodyPreview();
        this.bodyPreview = body == null ? "" :
                (body.length() > PREVIEW_LENGTH ? body.substring(0, PREVIEW_LENGTH) + "…" : body);
        this.attachmentCount = (int) p.getAttachmentCount();
        this.receivedAt = p.getReceivedAt();
    }
}
