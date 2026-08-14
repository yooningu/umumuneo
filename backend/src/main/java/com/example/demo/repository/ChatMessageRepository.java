package com.example.demo.repository;

import com.example.demo.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {

    // 세션의 메시지 목록 (순서대로)
    List<ChatMessage> findBySessionIdOrderByTurnIndexAsc(String sessionId);

    // 세션의 마지막 턴 인덱스
    Integer countBySessionId(String sessionId);
}
