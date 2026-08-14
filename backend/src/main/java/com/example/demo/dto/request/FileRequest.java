package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

public class FileRequest {

    @Getter
    public static class CreateDirectory {
        @NotBlank(message = "폴더 이름은 필수입니다.")
        private String name;
        private String parentId;
    }

    @Getter
    public static class Rename {
        @NotBlank(message = "파일 이름은 필수입니다.")
        private String name;
    }
}
