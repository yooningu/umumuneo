package com.example.demo.dto.response;

import com.example.demo.service.BusService;
import lombok.Getter;

// 정류소를 지나는 노선 목록 (아직 즐겨찾기에 등록 전) - 여기서 routeId를 골라
// POST /bus/my-stops/{stopId}/lines 로 즐겨찾기에 등록함
@Getter
public class StopRouteResponse {
    private final String routeId;
    private final String routeNo;
    private final String routeType;
    private final String startStopName;
    private final String endStopName;

    public StopRouteResponse(BusService.StopRoute route) {
        this.routeId = route.routeId();
        this.routeNo = route.routeNo();
        this.routeType = route.routeType();
        this.startStopName = route.startStopName();
        this.endStopName = route.endStopName();
    }
}
