package com.example.demo.repository;

import com.example.demo.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    // 발송 예정 알림 조회 (스케줄러용)
    List<Notification> findByNotifyAtBeforeAndIsSentFalse(LocalDateTime now);

    // 유저의 모든 알림 조회
    List<Notification> findByUserId(String userId);

    // 가장 이른 미발송 알림 1개 조회 (스케줄러용)
    Optional<Notification> findTopByIsSentFalseOrderByNotifyAtAsc();
}
