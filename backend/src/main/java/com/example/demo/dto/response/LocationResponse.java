package com.example.demo.dto.response;

import com.example.demo.entity.User;
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
}
