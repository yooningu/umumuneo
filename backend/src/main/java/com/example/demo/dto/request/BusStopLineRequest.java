package com.example.demo.dto.request;

import lombok.Getter;

// 즐겨찾는 정류장 안에서 챙겨볼 노선 추가 - routeId/lineNo는 "그 정류장 경유노선 목록"
// (StopRouteResponse)에서 그대로 가져와서 보내면 됨. alarmMinutes는 null이면 알림 없이 추적만 함
@Getter
public class BusStopLineRequest {
    private String routeId;
    private String lineNo;
    private Integer alarmMinutes;
}
