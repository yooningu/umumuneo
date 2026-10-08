package com.example.demo.dto.response;

import com.example.demo.entity.InboundEmail;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class InboundEmailDetailResponse {

    private final String id;
    private final String fromAddress;
    private final String subject;
    private final String body;
    private final String bodyHtml;
    private final LocalDateTime receivedAt;
    private final List<EmailAttachmentResponse> attachments;

    public InboundEmailDetailResponse(InboundEmail email) {
        this.id = email.getId();
        this.fromAddress = email.getFromAddress();
        this.subject = email.getSubject();
        this.body = email.getBody();
        this.bodyHtml = email.getBodyHtml();
        this.receivedAt = email.getReceivedAt();
        this.attachments = email.getAttachments().stream().map(EmailAttachmentResponse::new).toList();
    }
}
