package com.example.demo.repository;

import com.example.demo.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, String> {

    // 유저의 세션 목록 (최신순)
    List<ChatSession> findByUserIdOrderByLastActiveAtDesc(String userId);
}
