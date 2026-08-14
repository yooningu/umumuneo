package com.example.demo.dto.request;

import com.example.demo.entity.User.Theme;
import lombok.Getter;

@Getter
public class UserRequest {
    private String nickname;
    private Integer notifOffsetMin;
    private Boolean notifEnabled;
    private Theme theme;
}
