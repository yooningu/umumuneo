package com.example.demo.controller;

import com.example.demo.service.HolidayService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/holidays")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class HolidayController {

    private final HolidayService holidayService;

    // GET /api/v1/holidays?year=2026&month=10
    @GetMapping
    public ResponseEntity<List<HolidayService.Holiday>> getHolidays(
            @RequestParam int year,
            @RequestParam int month
    ) throws Exception {
        return ResponseEntity.ok(holidayService.getHolidays(year, month));
    }
}
