package com.example.demo.controller;

import com.example.demo.dto.request.LocationRequest;
import com.example.demo.dto.request.UserRequest;
import com.example.demo.dto.response.LocationResponse;
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

    // GET /api/v1/users/me/location - 날씨/버스 기능에 쓰는 내 기준 위치 조회
    @GetMapping("/me/location")
    public ResponseEntity<LocationResponse> getLocation(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(userService.getLocation(userId));
    }

    // PUT /api/v1/users/me/location - 주소 문자열 또는 GPS 좌표로 내 위치 설정
    // (request.address가 있으면 주소로, 없고 latitude/longitude가 있으면 GPS로 처리)
    @PutMapping("/me/location")
    public ResponseEntity<LocationResponse> setLocation(
            @AuthenticationPrincipal String userId,
            @RequestBody LocationRequest request
    ) throws Exception {
        LocationResponse response;
        if (request.getAddress() != null && !request.getAddress().isBlank()) {
            response = userService.setLocationByAddress(userId, request.getAddress());
        } else if (request.getLatitude() != null && request.getLongitude() != null) {
            response = userService.setLocationByGps(userId, request.getLatitude(), request.getLongitude());
        } else {
            throw new IllegalArgumentException("address 또는 latitude/longitude 중 하나는 필요합니다.");
        }
        return ResponseEntity.ok(response);
    }
}
