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

    // POST /api/v1/chat/messages/{requestId}/cancel - "중단" 버튼. 그 턴의 생성만 멈춤
    // (연결이 끊겨서가 아니라 사용자가 직접 멈춘 거라는 걸 구분하는 용도 - 탭을 닫거나 다른
    // 화면으로 이동한 경우는 이걸 호출하지 않으므로 생성이 그대로 끝까지 이어져 저장됨)
    @PostMapping("/messages/{requestId}/cancel")
    public ResponseEntity<Void> cancelMessage(
            @AuthenticationPrincipal String userId,
            @PathVariable String requestId
    ) {
        chatService.cancelRequest(requestId);
        return ResponseEntity.ok().build();
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
