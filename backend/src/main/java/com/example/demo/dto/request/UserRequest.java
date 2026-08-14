package com.example.demo.dto.request;

import com.example.demo.entity.User.Theme;
import lombok.Getter;

@Getter
public class UserRequest {
    private String nickname;
    private Integer notifOffsetMin;
    private Boolean notifEnabled;
    private Theme theme;
    // umumuneo.com 개인 메일 별칭 (예: "abc123" -> abc123@umumuneo.com). 영소문자/숫자만, 3~20자
    private String emailAlias;
}
