package com.example.demo.dto.response;

import com.example.demo.entity.User;
import com.example.demo.service.AddressService;
import lombok.Getter;

@Getter
public class LocationResponse {
    private final String adminDong;
    private final Double latitude;
    private final Double longitude;

    public LocationResponse(User user) {
        this.adminDong = user.getAdminDong();
        this.latitude = user.getLatitude();
        this.longitude = user.getLongitude();
    }

    // 저장 전 미리보기용(AddressService.previewByGps) - User 엔티티 없이 지오코딩 결과만으로 바로 만듦
    public LocationResponse(AddressService.LocationInfo info) {
        this.adminDong = info.adminDong();
        this.latitude = info.latitude();
        this.longitude = info.longitude();
    }
}
