package com.example.demo.dto.request;

import lombok.Getter;

// Cloudflare Worker가 메일에서 뽑아낸 첨부파일 하나 - base64로 인코딩된 원본 바이트를 그대로 담아 보냄
@Getter
public class EmailAttachmentRequest {

    private String filename;
    private String contentType;
    private String dataBase64;
}
