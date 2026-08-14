package com.example.demo.controller;

import com.example.demo.dto.request.ChatRequest;
import com.example.demo.dto.response.ChatResponse;
import com.example.demo.service.ChatService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class ChatController {

    private final ChatService chatService;

    // GET /api/v1/chat/sessions
    @GetMapping("/sessions")
    public ResponseEntity<List<ChatResponse.SessionInfo>> getSessions(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(chatService.getSessions(userId));
    }

    // GET /api/v1/chat/sessions/{id}/messages
    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<List<ChatResponse.MessageInfo>> getMessages(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(chatService.getMessages(userId, id));
    }

    // POST /api/v1/chat/messages (SSE 스트리밍)
    @PostMapping(value = "/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter sendMessage(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ChatRequest request
    ) {
        return chatService.sendMessage(userId, request);
    }

    // DELETE /api/v1/chat/sessions/{id}
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> deleteSession(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        chatService.deleteSession(userId, id);
        return ResponseEntity.noContent().build();
    }
}
