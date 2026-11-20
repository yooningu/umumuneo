package com.example.demo.controller;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.WeatherService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/weather")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class WeatherController {

    private final WeatherService weatherService;
    private final UserRepository userRepository;

    // GET /api/v1/weather - 내가 설정해둔 위치(User.kmaNx/kmaNy) 기준 예보.
    // 위치를 아직 설정 안 했으면(둘 다 null) WeatherService 기본 격자(application.properties)로 대체
    @GetMapping
    public ResponseEntity<List<WeatherService.DayForecast>> getForecast(
            @AuthenticationPrincipal String userId
    ) throws Exception {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        List<WeatherService.DayForecast> forecast = (user.getKmaNx() != null && user.getKmaNy() != null)
                ? weatherService.getForecast(user.getKmaNx(), user.getKmaNy())
                : weatherService.getForecast();
        return ResponseEntity.ok(forecast);
    }
}
