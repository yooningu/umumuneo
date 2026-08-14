package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", nullable = false, unique = true)
    private Schedule schedule;

    @Column(name = "offset_min", nullable = false)
    private Integer offsetMin = 10;

    @Column(name = "notify_at", nullable = false)
    private LocalDateTime notifyAt;

    @Column(name = "is_sent", nullable = false)
    private Boolean isSent = false;

    @Column(name = "kakao_event_id")
    private String kakaoEventId; // 톡캘린더에 등록된 이벤트 ID (등록 실패/미동의 시 null)
}
