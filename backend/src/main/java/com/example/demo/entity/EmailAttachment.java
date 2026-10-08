package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// 수신 이메일(InboundEmail)에 딸려온 첨부파일. 실제 바이트는 디스크(file.upload-dir)에 저장하고
// 여기엔 메타데이터 + 경로만 들고 있음 (FileService/FileEntity의 NAS 저장 방식과 동일한 패턴).
@Entity
@Table(name = "email_attachments")
@Getter
@Setter
@NoArgsConstructor
public class EmailAttachment {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inbound_email_id", nullable = false)
    private InboundEmail inboundEmail;

    @Column(length = 255, nullable = false)
    private String filename;

    @Column(name = "content_type", length = 150)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "storage_path", length = 1000, nullable = false)
    private String storagePath;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
