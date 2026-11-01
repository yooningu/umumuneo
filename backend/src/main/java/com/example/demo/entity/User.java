package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "kakao_id", nullable = false, unique = true)
    private Long kakaoId;

    @Column(length = 50, nullable = false)
    private String nickname;

    // umumuneo.com 개인 메일 수신용 별칭 (예: "x7k2m9pq" -> x7k2m9pq@umumuneo.com 으로 온 메일이 이 유저 것)
    @Column(name = "email_alias", length = 50, unique = true)
    private String emailAlias;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "kakao_access_token", columnDefinition = "TEXT")
    private String kakaoAccessToken;

    @Column(name = "kakao_refresh_token", columnDefinition = "TEXT")
    private String kakaoRefreshToken;

    @Column(name = "notif_offset_min", nullable = false)
    private Integer notifOffsetMin = 10;

    @Column(name = "notif_enabled", nullable = false)
    private Boolean notifEnabled = true;

    @Enumerated(EnumType.STRING)
    @Column(length = 10, nullable = false)
    private Theme theme = Theme.SYSTEM;

    @Column(name = "color_index", nullable = false)
    private Integer colorIndex = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 회원탈퇴 요청 시각 - null이 아니면 탈퇴 처리 중(로그인 차단). 이 시점으로부터 30일 뒤
    // AccountDeletionCleanupService가 실제로 데이터를 전부 지운다 (그 전까지는 데이터 보존)
    @Column(name = "deletion_requested_at")
    private LocalDateTime deletionRequestedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Theme {
        LIGHT, DARK, SYSTEM
    }
}