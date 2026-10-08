package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

import java.util.List;

@Getter
public class InboundEmailRequest {

    @NotBlank(message = "보낸 사람은 필수입니다.")
    private String from;

    // 받는 주소 (예: abc123@umumuneo.com) - 이 앞부분으로 어느 유저 것인지 찾음
    private String to;

    private String subject;

    private String body;

    // 원본 HTML (Worker가 뽑아낸 것, 없으면 null)
    private String bodyHtml;

    // Worker가 MIME을 파싱해서 뽑아낸 첨부파일들 (없으면 null/빈 리스트)
    private List<EmailAttachmentRequest> attachments;
}
