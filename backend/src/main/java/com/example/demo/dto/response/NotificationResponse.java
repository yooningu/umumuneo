package com.example.demo.dto.response;

import com.example.demo.entity.Notification;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class NotificationResponse {

    private final String id;
    private final String scheduleId;
    private final String scheduleTitle;
    private final Integer offsetMin;
    private final LocalDateTime notifyAt;
    private final Boolean isSent;

    public NotificationResponse(Notification notification) {
        this.id = notification.getId();
        this.scheduleId = notification.getSchedule().getId();
        this.scheduleTitle = notification.getSchedule().getTitle();
        this.offsetMin = notification.getOffsetMin();
        this.notifyAt = notification.getNotifyAt();
        this.isSent = notification.getIsSent();
    }
}
