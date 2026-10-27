package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "files")
@Getter
@Setter
@NoArgsConstructor
public class FileEntity {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private FileEntity parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileEntity> children = new ArrayList<>();

    // 이 파일이 어디서 들어왔는지 - NAS 사이드바에서 "이메일"/"챗봇"/"업로드"로 구분해서 보여주는 데 씀.
    // nullable로 둔 이유: 이 필드가 생기기 전부터 있던 기존 파일들은 DB에 NULL로 남는데,
    // NOT NULL로 선언하면 Hibernate ddl-auto=update가 컬럼을 추가하는 ALTER TABLE 자체가
    // 기존 행 때문에 실패할 수 있음. 코드에서는 null을 UPLOAD와 동일하게 취급한다.
    public enum FileSource { UPLOAD, CHATBOT, EMAIL }

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 20)
    private FileSource source = FileSource.UPLOAD;

    // source가 EMAIL일 때만 값이 있음 - 어떤 메일의 첨부파일인지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_id")
    private InboundEmail email;

    @Column(length = 255, nullable = false)
    private String name;

    @Column(name = "storage_path", length = 1000)
    private String storagePath;

    @Column(name = "is_directory", nullable = false)
    private Boolean isDirectory = false;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(length = 20)
    private String extension;

    @Column(name = "thumbnail_path", length = 500)
    private String thumbnailPath;

    @Column(name = "is_favorite", nullable = false)
    private Boolean isFavorite = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // 브라우저에서 바로 보여줄 수 있는(inline) 파일 형식인지 - 이미지/영상/PDF만 허용, 나머지는 다운로드만 가능
    public static boolean isPreviewable(String mimeType) {
        if (mimeType == null) return false;
        return mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.equals("application/pdf");
    }
}
