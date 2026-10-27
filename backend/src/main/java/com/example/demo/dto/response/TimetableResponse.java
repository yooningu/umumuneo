package com.example.demo.dto.response;

import com.example.demo.entity.Timetable;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
public class TimetableResponse {

    private final String id;
    private final String groupId;
    private final String title;
    private final String color;
    private final Integer dayOfWeek;
    private final LocalTime startTime;
    private final LocalTime endTime;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public TimetableResponse(Timetable timetable) {
        this.id = timetable.getId();
        this.groupId = timetable.getGroupId();
        this.title = timetable.getTitle();
        this.color = timetable.getColor();
        this.dayOfWeek = timetable.getDayOfWeek();
        this.startTime = timetable.getStartTime();
        this.endTime = timetable.getEndTime();
        this.createdAt = timetable.getCreatedAt();
        this.updatedAt = timetable.getUpdatedAt();
    }
}
