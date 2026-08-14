package com.example.demo.service;

import com.example.demo.entity.ChatMessage;
import com.example.demo.entity.ChatMessage.MessageRole;
import com.example.demo.entity.ChatSession;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatSaveService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatSessionRepository chatSessionRepository;

    // AI 메시지 저장
    @Transactional
    public void saveAiMessage(String sessionId, String content, int turnIndex) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        ChatMessage aiMessage = new ChatMessage();
        aiMessage.setSession(session);
        aiMessage.setRole(MessageRole.ASSISTANT);
        aiMessage.setContent(content);
        aiMessage.setIsSummarized(false);
        aiMessage.setTurnIndex(turnIndex);
        chatMessageRepository.save(aiMessage);
    }

    // 세션 제목 업데이트
    @Transactional
    public void updateSessionTitle(String sessionId, String title) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        session.setTitle(title);
        chatSessionRepository.save(session);
    }

    // 세션 마지막 활동 시간 업데이트
    @Transactional
    public void updateSessionLastActive(String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        session.setLastActiveAt(LocalDateTime.now());
        chatSessionRepository.save(session);
    }

    // 메시지 요약 처리
    @Transactional
    public void markAsSummarized(List<String> messageIds, String sessionId, String summary) {
        chatMessageRepository.findAllById(messageIds)
                .forEach(m -> m.setIsSummarized(true));
        chatMessageRepository.saveAll(chatMessageRepository.findAllById(messageIds));

        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        String existing = session.getSummary() != null ? session.getSummary() + "\n" : "";
        session.setSummary(existing + summary);
        chatSessionRepository.save(session);
    }
}
