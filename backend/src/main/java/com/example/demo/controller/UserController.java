package com.example.demo.controller;

import com.example.demo.dto.request.UserRequest;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class UserController {

    private final UserService userService;

    // GET /api/v1/users/me
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(userService.getMe(userId));
    }

    // PATCH /api/v1/users/me
    @PatchMapping("/me")
    public ResponseEntity<Void> updateMe(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody UserRequest request
    ) {
        userService.updateMe(userId, request);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/v1/users/me - 회원탈퇴 요청. 바로 지워지지 않고 30일 뒤에 실제로 삭제됨
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMe(
            @AuthenticationPrincipal String userId
    ) {
        userService.requestDeletion(userId);
        return ResponseEntity.ok().build();
    }
}
