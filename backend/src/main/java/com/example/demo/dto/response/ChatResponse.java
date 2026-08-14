package com.example.demo.dto.response;

import com.example.demo.entity.ChatMessage;
import com.example.demo.entity.ChatSession;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

public class ChatResponse {

    @Getter
    @AllArgsConstructor
    public static class SessionInfo {
        private String id;
        private String title;
        private String modelName;
        private LocalDateTime lastActiveAt;
        private LocalDateTime createdAt;

        public SessionInfo(ChatSession session) {
            this.id = session.getId();
            this.title = session.getTitle();
            this.modelName = session.getModelName();
            this.lastActiveAt = session.getLastActiveAt();
            this.createdAt = session.getCreatedAt();
        }
    }

    @Getter
    @AllArgsConstructor
    public static class MessageInfo {
        private String id;
        private String role;
        private String content;
        private Boolean isSummarized;
        private Integer turnIndex;
        private LocalDateTime createdAt;

        public MessageInfo(ChatMessage message) {
            this.id = message.getId();
            this.role = message.getRole().name();
            this.content = message.getContent();
            this.isSummarized = message.getIsSummarized();
            this.turnIndex = message.getTurnIndex();
            this.createdAt = message.getCreatedAt();
        }
    }
}
