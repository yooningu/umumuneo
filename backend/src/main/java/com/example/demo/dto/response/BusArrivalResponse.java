package com.example.demo.dto.response;

import com.example.demo.service.BusService;
import lombok.Getter;

@Getter
public class BusArrivalResponse {
    private final String stopName;
    private final String routeId;
    private final String lineNo;
    private final String routeType;
    private final Integer stationsLeft;
    private final String vehicleType;
    private final Integer arrivalSeconds;

    public BusArrivalResponse(BusService.TagoArrival arrival) {
        this.stopName = arrival.stopName();
        this.routeId = arrival.routeId();
        this.lineNo = arrival.routeNo();
        this.routeType = arrival.routeType();
        this.stationsLeft = arrival.stationsLeft();
        this.vehicleType = arrival.vehicleType();
        this.arrivalSeconds = arrival.arrivalSeconds();
    }
}
