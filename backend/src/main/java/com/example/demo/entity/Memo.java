package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// 홈 화면 메모장 - 유저당 여러 개를 탭처럼 둘 수 있는 자유 메모 (저장 버튼 없이 입력하는 대로 자동 저장됨).
// 제목은 따로 저장하지 않고 프론트에서 내용 첫 줄을 그대로 제목처럼 보여준다(브라우저 탭 제목과 같은 방식).
@Entity
@Table(name = "memos")
@Getter
@Setter
@NoArgsConstructor
public class Memo {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(columnDefinition = "TEXT")
    private String content;

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
}
