package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalTime;
import java.util.List;

// 한 번에 여러 요일을 묶어서 만들고(=같은 groupId) 같이 수정/삭제하기 위한 요청.
// 요일 하나만 고르면 dayOfWeeks 크기가 1인 묶음이 됨
@Getter
public class TimetableRequest {

    @NotBlank(message = "제목은 필수입니다.")
    private String title;

    @NotBlank(message = "색상은 필수입니다.")
    private String color; // 프론트에서 고정된 색상 목록 중 고른 색

    @NotEmpty(message = "요일을 한 개 이상 선택해주세요.")
    private List<Integer> dayOfWeeks; // 0(일)~6(토)

    @NotNull(message = "시작 시간은 필수입니다.")
    private LocalTime startTime;

    @NotNull(message = "종료 시간은 필수입니다.")
    private LocalTime endTime;
}
