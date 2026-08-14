package com.example.demo.dto.response;

import com.example.demo.entity.Notification;
import com.example.demo.entity.Schedule;
import com.example.demo.entity.Schedule.ScheduleType;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
public class ScheduleResponse {

    private final String id;
    private final ScheduleType type;
    private final String title;
    private final String description;
    private final String color;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final LocalTime startTime;
    private final LocalTime endTime;
    private final NotificationInfo notification;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public ScheduleResponse(Schedule schedule) {
        this.id = schedule.getId();
        this.type = schedule.getType();
        this.title = schedule.getTitle();
        this.description = schedule.getDescription();
        this.color = schedule.getColor();
        this.startDate = schedule.getStartDate();
        this.endDate = schedule.getEndDate();
        this.startTime = schedule.getStartTime();
        this.endTime = schedule.getEndTime();
        this.notification = schedule.getNotification() != null
                ? new NotificationInfo(schedule.getNotification())
                : null;
        this.createdAt = schedule.getCreatedAt();
        this.updatedAt = schedule.getUpdatedAt();
    }

    @Getter
    public static class NotificationInfo {
        private final String id;
        private final Integer offsetMin;
        private final LocalDateTime notifyAt;

        public NotificationInfo(Notification notification) {
            this.id = notification.getId();
            this.offsetMin = notification.getOffsetMin();
            this.notifyAt = notification.getNotifyAt();
        }
    }
}
