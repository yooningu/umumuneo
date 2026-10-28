package com.example.demo.service;

import com.example.demo.entity.UploadSession;
import com.example.demo.repository.UploadSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

// 큰 파일 조각(청크) 업로드를 시작(init)만 해놓고 끝까지 안 끝낸 세션(complete/cancel 없이
// 탭을 닫는 등)은 서버에 영원히 남아서 디스크를 계속 잡아먹는다. 한참 지난 미완료 세션은
// 주기적으로 찾아서 조각 파일/세션 행을 같이 지워준다.
@Slf4j
@Service
@RequiredArgsConstructor
public class UploadSessionCleanupService {

    private static final long MAX_AGE_HOURS = 24;

    private final UploadSessionRepository uploadSessionRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    // 1시간마다 한 번씩 확인
    @Scheduled(fixedRate = 60 * 60 * 1000)
    @Transactional
    public void cleanupAbandonedSessions() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(MAX_AGE_HOURS);
        List<UploadSession> abandoned = uploadSessionRepository.findByCreatedAtBefore(cutoff);
        if (abandoned.isEmpty()) return;

        for (UploadSession session : abandoned) {
            try {
                deleteDirectoryRecursive(Paths.get(uploadDir, session.getUser().getId(), "_chunks", session.getId()));
            } catch (IOException e) {
                log.warn("미완료 업로드 세션({}) 조각 파일 정리 실패: {}", session.getId(), e.getMessage());
            }
        }
        uploadSessionRepository.deleteAll(abandoned);
        log.info("{}시간 넘은 미완료 업로드 세션 {}개 정리함", MAX_AGE_HOURS, abandoned.size());
    }

    private void deleteDirectoryRecursive(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.delete(p);
                } catch (IOException ignored) {
                    // 임시 조각 정리 실패는 치명적이지 않으므로 무시
                }
            });
        }
    }
}
