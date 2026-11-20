package com.example.demo.dto.response;

import com.example.demo.service.BusService;
import lombok.Getter;

// 내 주변 정류장 검색 결과 (아직 즐겨찾기에 등록 전) - 여기서 nodeId/cityCode를 골라
// POST /bus/my-stops 로 즐겨찾기에 등록함
@Getter
public class NearbyStopResponse {
    private final String nodeId;
    private final String cityCode;
    private final String stopName;
    private final double latitude;
    private final double longitude;

    public NearbyStopResponse(BusService.NearbyStop stop) {
        this.nodeId = stop.nodeId();
        this.cityCode = stop.cityCode();
        this.stopName = stop.stopName();
        this.latitude = stop.latitude();
        this.longitude = stop.longitude();
    }
}
