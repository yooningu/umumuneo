package com.example.demo.dto.request;

import lombok.Getter;

// 즐겨찾는 정류장 안에서 챙겨볼 노선 추가/수정 - alarmMinutes는 null이면 알림 없이 추적만 함
@Getter
public class BusStopLineRequest {
    private String lineNo;
    private Integer alarmMinutes;
}
