package com.example.demo.repository;

import com.example.demo.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, String> {

    // 유저의 알림 발송 로그 전체 조회 (회원탈퇴 시 전부 정리하는 용도 - user_id가 NOT NULL FK라서 남아있으면 안 됨)
    List<NotificationLog> findByUserId(String userId);
}
