package com.example.demo.controller;

import com.example.demo.dto.request.ScheduleRequest;
import com.example.demo.dto.response.ScheduleResponse;
import com.example.demo.entity.Schedule.ScheduleType;
import com.example.demo.service.ScheduleService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class ScheduleController {

    private final ScheduleService scheduleService;

    // GET /api/v1/schedules?from=2026-07-01&to=2026-07-31&type=TIMED
    @GetMapping
    public ResponseEntity<List<ScheduleResponse>> getSchedules(
            @AuthenticationPrincipal String userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) ScheduleType type
    ) {
        return ResponseEntity.ok(scheduleService.getSchedules(userId, from, to, type));
    }

    // GET /api/v1/schedules/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ScheduleResponse> getSchedule(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        return ResponseEntity.ok(scheduleService.getSchedule(userId, id));
    }

    // POST /api/v1/schedules
    @PostMapping
    public ResponseEntity<Void> createSchedule(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody ScheduleRequest request
    ) {
        System.out.println("userId: " + userId);
        scheduleService.createSchedule(userId, request);
        return ResponseEntity.status(201).build();
    }

    // PUT /api/v1/schedules/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Void> updateSchedule(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @Valid @RequestBody ScheduleRequest request
    ) {
        scheduleService.updateSchedule(userId, id, request);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/v1/schedules/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchedule(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        scheduleService.deleteSchedule(userId, id);
        return ResponseEntity.noContent().build();
    }
}
