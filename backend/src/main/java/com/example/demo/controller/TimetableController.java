package com.example.demo.controller;

import com.example.demo.dto.request.TimetableRequest;
import com.example.demo.dto.response.TimetableResponse;
import com.example.demo.service.TimetableService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/timetable")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class TimetableController {

    private final TimetableService timetableService;

    // GET /api/v1/timetable
    @GetMapping
    public ResponseEntity<List<TimetableResponse>> getTimetables(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(timetableService.getTimetables(userId));
    }

    // POST /api/v1/timetable - 요일을 여러 개 고르면 한 묶음(같은 groupId)으로 생성됨
    @PostMapping
    public ResponseEntity<Void> createTimetableGroup(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TimetableRequest request
    ) {
        timetableService.createTimetableGroup(userId, request);
        return ResponseEntity.status(201).build();
    }

    // PUT /api/v1/timetable/group/{groupId} - 묶음 전체를 같이 수정
    @PutMapping("/group/{groupId}")
    public ResponseEntity<Void> updateTimetableGroup(
            @AuthenticationPrincipal String userId,
            @PathVariable String groupId,
            @Valid @RequestBody TimetableRequest request
    ) {
        timetableService.updateTimetableGroup(userId, groupId, request);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/v1/timetable/group/{groupId} - 묶음 전체를 같이 삭제
    @DeleteMapping("/group/{groupId}")
    public ResponseEntity<Void> deleteTimetableGroup(
            @AuthenticationPrincipal String userId,
            @PathVariable String groupId
    ) {
        timetableService.deleteTimetableGroup(userId, groupId);
        return ResponseEntity.noContent().build();
    }
}
