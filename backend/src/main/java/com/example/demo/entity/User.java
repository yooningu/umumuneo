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

    // 날씨/버스 기능에 쓰는 기준 위치 - 주소 직접 입력이든 GPS든 결국 이 5개로 정리돼서 저장됨
    // (AddressService.LocationInfo 참고). 아직 위치를 설정 안 한 유저는 전부 null
    @Column(name = "admin_dong", length = 100)
    private String adminDong;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    // 기상청 단기예보 API 전용 격자좌표 - 위경도로부터 KmaGridConverter로 미리 계산해서 저장해둠
    // (매번 변환하지 않고, 날씨 조회할 때 바로 씀)
    @Column(name = "kma_nx")
    private Integer kmaNx;

    @Column(name = "kma_ny")
    private Integer kmaNy;

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