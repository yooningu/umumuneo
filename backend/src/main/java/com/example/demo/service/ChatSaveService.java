package com.example.demo.service;

import com.example.demo.entity.ChatMessage;
import com.example.demo.entity.ChatMessage.MessageRole;
import com.example.demo.entity.ChatSession;
import com.example.demo.entity.User;
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

    // 세션을 찾거나(기존 대화) 새로 만들고(새 대화) + 유저 메시지를 저장한다.
    // 이 메서드 전체가 하나의 독립된 트랜잭션으로 묶여서 리턴하는 즉시 커밋된다.
    // ChatService.sendMessage가 비동기 AI 호출 스레드를 띄우기 "전에" 이 메서드를 끝까지 호출하므로,
    // AI가 얼마나 빨리 응답하든(점검 모드처럼 즉시 응답해도) 그 스레드가 세션을 조회할 때는
    // 항상 이미 커밋된 상태를 보게 되어 "세션을 찾을 수 없습니다" 레이스가 생기지 않는다.
    @Transactional
    public SessionBootstrap resolveSessionAndSaveUserMessage(User user, String requestedSessionId,
                                                              String model, String content) {
        ChatSession session;
        if (requestedSessionId != null) {
            session = chatSessionRepository.findById(requestedSessionId)
                    .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
            if (!session.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("해당 세션에 대한 권한이 없습니다.");
            }
        } else {
            session = new ChatSession();
            session.setUser(user);
            session.setModelName(model);
            chatSessionRepository.save(session);
        }

        // 이전 대화 내역 조회 (현재 메시지 저장 전 시점 기준)
        List<ChatMessage> history = chatMessageRepository.findBySessionIdOrderByTurnIndexAsc(session.getId());

        // 유저 메시지 저장
        int turnIndex = chatMessageRepository.countBySessionId(session.getId());
        ChatMessage userMessage = new ChatMessage();
        userMessage.setSession(session);
        userMessage.setRole(MessageRole.USER);
        userMessage.setContent(content);
        userMessage.setIsSummarized(false);
        userMessage.setTurnIndex(turnIndex);
        chatMessageRepository.save(userMessage);

        // 세션 마지막 활동 시간 업데이트
        session.setLastActiveAt(LocalDateTime.now());
        chatSessionRepository.save(session);

        return new SessionBootstrap(session, history, turnIndex);
    }

    public record SessionBootstrap(ChatSession session, List<ChatMessage> history, int turnIndex) {}

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
