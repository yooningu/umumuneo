package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// 로컬 OCR/문서 텍스트 추출 서비스(ocr-service) 프록시.
// 이미지는 PaddleOCR로, PDF는 PyMuPDF로 텍스트를 뽑아서 챗봇 프롬프트에 같이 넣어줄 때 씀
// (whisper-service 프록시인 SttService와 같은 구조).
@Slf4j
@Service
@RequiredArgsConstructor
public class OcrService {

    private final RestTemplate restTemplate;

    @Value("${ocr.base-url}")
    private String ocrBaseUrl;

    // 이미지에서 텍스트 추출 (PaddleOCR). 실패해도 예외를 던지지 않고 빈 문자열을 반환해서
    // OCR 하나 실패했다고 챗봇 응답 자체가 막히지 않게 한다 (호출부에서 try/catch 없이 안전하게 쓸 수 있음).
    public String extractFromImage(Resource resource, String filename) {
        return extract("/extract/image", resource, filename);
    }

    // PDF에서 텍스트 추출 (PyMuPDF). 이미지로 스캔된 PDF(텍스트 레이어 없음)는 빈 문자열이 나올 수 있음.
    public String extractFromPdf(Resource resource, String filename) {
        return extract("/extract/pdf", resource, filename);
    }

    private String extract(String path, Resource resource, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(ocrBaseUrl + path, request, Map.class);
            Map<?, ?> result = response.getBody();
            if (result == null) return "";
            Object error = result.get("error");
            if (error != null) {
                log.warn("'{}' 텍스트 추출 중 오류: {}", filename, error);
            }
            Object text = result.get("text");
            return text != null ? text.toString() : "";
        } catch (Exception e) {
            log.error("'{}' 텍스트 추출 요청 실패: {}", filename, e.getMessage());
            return "";
        }
    }
}
