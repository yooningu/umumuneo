package com.example.demo.dto.request;

import com.example.demo.entity.Schedule.RepeatRule;
import com.example.demo.entity.Schedule.ScheduleType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

// 챗봇이 [ACTION:SCHEDULE_ADD]로 만들어내는 JSON도 이 DTO로 그대로 파싱됨 - 작은 모델이
// 가끔 다른 액션 예시(keyword 등)를 헷갈려서 여기 없는 필드를 더 끼워 넣는 경우가 있어서,
// 모르는 필드는 에러 내지 말고 무시하도록 함(엄격하게 막으면 그 요청 전체가 실패해버림).
@JsonIgnoreProperties(ignoreUnknown = true)
@Getter
public class ScheduleRequest {

    @NotNull(message = "유형은 필수입니다.")
    private ScheduleType type;

    @NotBlank(message = "제목은 필수입니다.")
    private String title;

    private String description;

    @NotNull(message = "시작일은 필수입니다.")
    private LocalDate startDate;

    private LocalDate endDate;      // PERIOD만 사용

    private LocalTime startTime;    // TIMED, MOMENT만 사용

    private LocalTime endTime;      // TIMED만 사용

    private Integer notifOffsetMin; // null이면 알림 없음

    private RepeatRule repeatRule;  // null이면 반복 없음, 있으면 무기한 반복
}
