package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// 유저가 "차단"한 보낸사람 주소 하나. InboundEmailService.receive()에서 메일이 들어올 때마다
// 받는 사람이 이 보낸사람을 차단했는지 확인해서, 차단했으면 메일 자체를 저장하지 않는다.
@Entity
@Table(name = "blocked_senders")
@Getter
@Setter
@NoArgsConstructor
public class BlockedSender {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 항상 소문자로 정규화해서 저장/비교함
    @Column(name = "address", length = 320, nullable = false)
    private String address;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
