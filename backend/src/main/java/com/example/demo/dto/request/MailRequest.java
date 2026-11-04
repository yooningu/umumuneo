package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

public class MailRequest {

    @Getter
    public static class SetRead {
        @NotNull(message = "isRead는 필수입니다.")
        private Boolean isRead;
    }

    @Getter
    public static class Block {
        @NotBlank(message = "차단할 주소는 필수입니다.")
        private String address;
    }
}
