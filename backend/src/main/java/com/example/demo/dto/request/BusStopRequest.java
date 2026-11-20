package com.example.demo.dto.request;

import lombok.Getter;

// 즐겨찾는 정류장 등록 - arsno/stopName/위경도는 보통 "내 주변 정류장" 검색 결과(NearbyStopResponse)에서
// 그대로 가져와서 보내면 됨. nickname은 선택(안 주면 stopName 그대로 보여줌)
@Getter
public class BusStopRequest {
    private String arsno;
    private String stopName;
    private String nickname;
    private Double latitude;
    private Double longitude;
}
