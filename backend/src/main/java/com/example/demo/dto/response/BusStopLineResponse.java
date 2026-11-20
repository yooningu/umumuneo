package com.example.demo.dto.response;

import com.example.demo.entity.UserBusStopLine;
import lombok.Getter;

@Getter
public class BusStopLineResponse {
    private final String id;
    private final String routeId;
    private final String lineNo;
    private final Integer alarmMinutes;

    public BusStopLineResponse(UserBusStopLine line) {
        this.id = line.getId();
        this.routeId = line.getRouteId();
        this.lineNo = line.getLineNo();
        this.alarmMinutes = line.getAlarmMinutes();
    }
}
