package com.example.demo.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Refresh Token 검증 실패 → 401
    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<Map<String, String>> handleInvalidRefreshToken(InvalidRefreshTokenException e) {
        log.warn("Refresh Token 검증 실패: {}", e.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "error", "InvalidRefreshToken",
                        "message", e.getMessage() != null ? e.getMessage() : "유효하지 않은 Refresh Token입니다."
                ));
    }

    // 존재하지 않는 경로로 요청 → 404 (예전엔 아래 catch-all(Exception.class)에 걸려서
    // "경로가 아예 없음"도 500으로 나갔는데, 그러면 "배포가 안 됐다/경로 오타"랑 "서버 코드가
    // 실제로 터졌다"를 구분할 수가 없어서 혼란스러웠음 - 제대로 404로 분리함)
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoResourceFound(NoResourceFoundException e) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                        "error", "NotFound",
                        "message", "존재하지 않는 API 경로입니다: " + e.getResourcePath()
                ));
    }

    // 그 외 처리되지 않은 예외 → 500
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAll(Exception e) {
        // 스택 트레이스 전체를 콘솔에 출력
        log.error("처리되지 않은 예외 발생", e);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "error", e.getClass().getSimpleName(),
                        "message", e.getMessage() != null ? e.getMessage() : "null"
                ));
    }
}
