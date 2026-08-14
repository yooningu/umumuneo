package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

import java.util.List;

@Getter
public class ChatRequest {

    private String sessionId;   // null이면 새 세션 생성

    private String model = "gemma4:e4b";  // 기본 모델

    @NotBlank(message = "메시지 내용은 필수입니다.")
    private String content;

    private List<String> images;  // base64 인코딩된 이미지

    private List<String> audio;  // base64 인코딩된 음성 파일 (서버에서 STT로 변환 후 프롬프트에 반영)

    private List<FileRef> sendableFiles;  // 첨부 파일 (이름 + NAS 파일 ID). "나에게 보내기"에서 공개 링크로 전달할 때 씀

    private boolean hasAttachment = false;  // 이미지든 아니든 파일이 첨부되면 true (있으면 vision 모델로 전환)

    // true면 DB에 저장하지 않고 서버 메모리에만 대화를 유지한다 (시크릿/임시 모드).
    // sessionId가 null이면 새 시크릿 대화 시작(기존 것 덮어씀), "secret"이면 이어지는 대화.
    private boolean secret = false;

    // 우무 음성 비서 전용 - true면 세션/메시지를 아예 안 만들고 기록도 안 남김 (요약/제목생성도 스킵).
    // 우무는 매번 독립적인 1회성 대화라서 시크릿 모드처럼 메모리에 잠깐 들고 있을 필요도 없음.
    private boolean umu = false;

    @Getter
    public static class FileRef {
        private String name;
        private String fileId;
        private boolean isImage;
    }
}
