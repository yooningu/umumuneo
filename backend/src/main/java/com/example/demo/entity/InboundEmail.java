package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// umumuneo.com으로 온 이메일 (Cloudflare Email Routing + Worker가 백엔드로 전달해준 것을 저장)
@Entity
@Table(name = "inbound_emails")
@Getter
@Setter
@NoArgsConstructor
public class InboundEmail {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "from_address", length = 320, nullable = false)
    private String fromAddress;

    // 수신 주소(예: abc123@umumuneo.com) 앞부분을 유저의 email_alias랑 매칭해서 연결.
    // 매칭되는 유저가 없으면(오타, 아직 등록 안 된 별칭 등) null로 남음
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 500)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "received_at", updatable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    protected void onCreate() {
        receivedAt = LocalDateTime.now();
    }
}
