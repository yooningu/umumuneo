package com.example.demo.dto.response;

import com.example.demo.entity.User;
import lombok.Getter;

@Getter
public class UserResponse {

    private final String id;
    private final String nickname;
    private final String email;
    private final Integer notifOffsetMin;
    private final Boolean notifEnabled;
    private final String theme;

    public UserResponse(User user) {
        this.id = user.getId();
        this.nickname = user.getNickname();
        this.email = user.getEmail();
        this.notifOffsetMin = user.getNotifOffsetMin();
        this.notifEnabled = user.getNotifEnabled();
        this.theme = user.getTheme().name();
    }
}
