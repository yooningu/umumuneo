package com.example.demo.dto.response;

import com.example.demo.service.BusService;
import lombok.Getter;

@Getter
public class BusArrivalResponse {
    private final String lineNo;
    private final String stopName;
    private final String min1;
    private final String station1;
    private final String min2;
    private final String station2;

    public BusArrivalResponse(BusService.BusArrival arrival) {
        this.lineNo = arrival.lineno();
        this.stopName = arrival.nodenm();
        this.min1 = arrival.min1();
        this.station1 = arrival.station1();
        this.min2 = arrival.min2();
        this.station2 = arrival.station2();
    }
}
