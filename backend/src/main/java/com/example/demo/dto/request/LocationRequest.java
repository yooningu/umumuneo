package com.example.demo.dto.request;

import lombok.Getter;

// 내 기준 위치 설정 - address만 보내면 주소 문자열로, latitude+longitude만 보내면 GPS로 처리함
// (AddressController가 둘 중 뭐가 왔는지 보고 AddressService의 geocodeAddress/reverseGeocode로 분기)
@Getter
public class LocationRequest {
    private String address;
    private Double latitude;
    private Double longitude;
}
