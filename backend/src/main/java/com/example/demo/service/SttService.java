package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Map;

// 로컬 Whisper STT 서비스(whisper-service, faster-whisper) 프록시.
// Qwen3-ASR은 DashScope API 키가 없어서, 로컬로 바로 돌릴 수 있는 Whisper로 대체함.
@Slf4j
@Service
@RequiredArgsConstructor
public class SttService {

    private final RestTemplate restTemplate;

    @Value("${whisper.base-url}")
    private String whisperBaseUrl;

    // 외부(프론트/로봇 등)에서 업로드된 파일을 직접 변환
    public Map<String, Object> transcribe(MultipartFile audio, String language) {
        Resource resource;
        try {
            resource = audio.getResource();
        } catch (Exception e) {
            throw new RuntimeException("오디오 파일을 읽을 수 없습니다.", e);
        }
        return transcribe(resource, language);
    }

    // 챗봇 흐름에서 base64로 넘어온 오디오를 변환 (ChatService에서 사용)
    public Map<String, Object> transcribeBase64(String base64Audio, String language) {
        byte[] bytes = Base64.getDecoder().decode(base64Audio);
        Resource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return "audio.webm";
            }
        };
        return transcribe(resource, language);
    }

    private Map<String, Object> transcribe(Resource resource, String language) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);
        if (language != null && !language.isBlank()) {
            body.add("language", language);
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.postForEntity(whisperBaseUrl + "/transcribe", request, Map.class);
        } catch (Exception e) {
            log.error("STT 요청 실패: {}", e.getMessage());
            throw new RuntimeException("음성 인식 서비스에 연결할 수 없습니다.", e);
        }

        if (response.getBody() == null) {
            throw new RuntimeException("STT 서비스 응답이 없습니다.");
        }
        return response.getBody();
    }
}
