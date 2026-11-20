package com.example.demo.dto.response;

import com.example.demo.entity.UserBusStop;
import lombok.Getter;

import java.util.List;

@Getter
public class BusStopResponse {
    private final String id;
    private final String nodeId;
    private final String cityCode;
    private final String stopName;
    private final String nickname;
    private final Double latitude;
    private final Double longitude;
    private final List<BusStopLineResponse> lines;

    public BusStopResponse(UserBusStop stop) {
        this.id = stop.getId();
        this.nodeId = stop.getNodeId();
        this.cityCode = stop.getCityCode();
        this.stopName = stop.getStopName();
        this.nickname = stop.getNickname();
        this.latitude = stop.getLatitude();
        this.longitude = stop.getLongitude();
        this.lines = stop.getLines().stream().map(BusStopLineResponse::new).toList();
    }
}
