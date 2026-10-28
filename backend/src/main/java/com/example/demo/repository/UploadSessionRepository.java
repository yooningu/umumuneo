package com.example.demo.repository;

import com.example.demo.entity.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSession, String> {

    // 한참 지나도 끝까지 안 끝난(complete/cancel 없이 방치된) 세션 - 주기적 정리용
    List<UploadSession> findByCreatedAtBefore(LocalDateTime cutoff);
}
