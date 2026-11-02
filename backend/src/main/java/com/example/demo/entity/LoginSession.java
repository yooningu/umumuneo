package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// 로그인 세션(기기) 하나. refresh token에는 이 행의 id가 jti(JWT ID)로 그대로 심어지고,
// /auth/refresh 때마다 이 행이 아직 존재하는지로 유효성을 확인한다 - 행을 지우면
// 그 refresh token은 즉시 무효가 됨 ("이 기기 로그아웃"의 핵심 메커니즘).
// access token은 계속 완전히 무상태(stateless)라 세션을 지워도 이미 발급된 access token은
// 자기 만료시간(최대 30분)까지는 그대로 동작한다 - 즉시 차단은 아니고 최대 30분 지연됨.
@Entity
@Table(name = "login_sessions")
@Getter
@Setter
@NoArgsConstructor
public class LoginSession {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // "Chrome · Windows" 같은 표시용 문자열 - User-Agent로 대충 추정한 것이라 정확하진 않음
    @Column(name = "device_label", length = 200)
    private String deviceLabel;

    // 같은 기기에서 또 로그인했을 때(ip+device 일치) 새 행을 안 만들고 이 행을 재사용하는 데도 씀
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    // IP로 조회한 대략적인 국가/도시(한글명) - 로컬 개발환경이나 조회 실패 시엔 비어있을 수 있음
    @Column(name = "country", length = 50)
    private String country;

    @Column(name = "city", length = 50)
    private String city;

    @Column(name = "remember_me", nullable = false)
    private Boolean rememberMe = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUsedAt = LocalDateTime.now();
    }
}
