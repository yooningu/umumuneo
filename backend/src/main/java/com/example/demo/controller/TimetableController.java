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

    // POST /api/v1/timetable
    @PostMapping
    public ResponseEntity<Void> createTimetable(
            @AuthenticationPrincipal String userId,
            @Valid @RequestBody TimetableRequest request
    ) {
        timetableService.createTimetable(userId, request);
        return ResponseEntity.status(201).build();
    }

    // PUT /api/v1/timetable/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Void> updateTimetable(
            @AuthenticationPrincipal String userId,
            @PathVariable String id,
            @Valid @RequestBody TimetableRequest request
    ) {
        timetableService.updateTimetable(userId, id, request);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/v1/timetable/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimetable(
            @AuthenticationPrincipal String userId,
            @PathVariable String id
    ) {
        timetableService.deleteTimetable(userId, id);
        return ResponseEntity.noContent().build();
    }
}
