package com.example.demo.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
public class TimetableRequest {

    @NotBlank(message = "제목은 필수입니다.")
    private String title;

    private String description;

    @NotNull(message = "요일은 필수입니다.")
    @Min(value = 0, message = "요일은 0(일)~6(토) 사이여야 합니다.")
    @Max(value = 6, message = "요일은 0(일)~6(토) 사이여야 합니다.")
    private Integer dayOfWeek;

    @NotNull(message = "시작 시간은 필수입니다.")
    private LocalTime startTime;

    @NotNull(message = "종료 시간은 필수입니다.")
    private LocalTime endTime;

    @NotNull(message = "시작일은 필수입니다.")
    private LocalDate validFrom;

    private LocalDate validUntil; // null이면 무기한
}
