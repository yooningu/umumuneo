package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// Cloudflare가 프록시 요청 본문을 100MB로 제한해서, 그보다 큰 파일은 통째로 못 올리고
// 작은 조각(청크)으로 나눠 여러 번 보낸 뒤 서버에서 하나로 합쳐야 한다. 이 엔티티는 그 합치기
// 전까지의 진행 상태(총 조각 수, 최종적으로 어디에 어떤 이름으로 저장할지)를 들고 있는 임시 세션.
// 실제로 받은 조각 파일 자체는 DB가 아니라 uploadDir/{userId}/_chunks/{sessionId}/{index}에 저장됨.
@Entity
@Table(name = "upload_sessions")
@Getter
@Setter
@NoArgsConstructor
public class UploadSession {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 255, nullable = false)
    private String filename;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "total_size", nullable = false)
    private Long totalSize;

    @Column(name = "total_chunks", nullable = false)
    private Integer totalChunks;

    // 완료 시 이 폴더 밑에 최종 파일을 넣음 (null이면 최상위)
    @Column(name = "parent_id")
    private String parentId;

    // FileEntity.FileSource 문자열 그대로 (UPLOAD/CHATBOT/EMAIL) - null이면 UPLOAD
    @Column(length = 20)
    private String source;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
