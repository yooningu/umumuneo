package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @Getter
    public static class Move {
        // null이면 최상위(루트)로 이동
        private String parentId;
    }

    // 큰 파일을 조각내서 올리기 시작할 때 - Cloudflare의 100MB 요청 본문 제한 때문에
    // 그보다 큰 파일은 /upload로 한 번에 못 올려서 /upload/init → /upload/chunk(여러 번) →
    // /upload/complete 순서로 나눠 보냄
    @Getter
    public static class InitChunkedUpload {
        @NotBlank(message = "파일 이름은 필수입니다.")
        private String filename;
        @NotNull(message = "전체 용량은 필수입니다.")
        private Long totalSize;
        @NotNull(message = "조각 개수는 필수입니다.")
        private Integer totalChunks;
        private String contentType;
        private String parentId;
        private String source;
    }

    @Getter
    public static class SessionId {
        @NotBlank(message = "세션 id는 필수입니다.")
        private String sessionId;
    }

    // txt 파일 간단 편집 - 내용 전체를 덮어씀 (빈 파일로 저장할 수도 있으므로 @NotBlank는 안 붙임)
    @Getter
    public static class UpdateContent {
        @NotNull(message = "내용은 필수입니다.")
        private String content;
    }
}
