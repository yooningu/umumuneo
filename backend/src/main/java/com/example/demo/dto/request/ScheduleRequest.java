package com.example.demo.dto.request;

import com.example.demo.entity.Schedule.ScheduleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

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
}
