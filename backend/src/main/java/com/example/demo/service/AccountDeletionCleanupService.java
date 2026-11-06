package com.example.demo.service;

import com.example.demo.entity.User;
import com.example.demo.repository.ChatSessionRepository;
import com.example.demo.repository.InboundEmailRepository;
import com.example.demo.repository.LoginSessionRepository;
import com.example.demo.repository.MemoRepository;
import com.example.demo.repository.NotificationLogRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.TimetableRepository;
import com.example.demo.repository.UploadSessionRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

// 회원탈퇴는 UserService.requestDeletion()에서 요청 시각만 기록하고 데이터는 그대로 둔다
// (바로 지우면 실수로 탈퇴했거나 마음이 바뀐 경우 복구가 안 되므로). 탈퇴 요청 후 30일이
// 지난 계정만 여기서 실제로 데이터를 전부 지운다.
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountDeletionCleanupService {

    private static final long RETENTION_DAYS = 30;

    private final UserRepository userRepository;
    private final LoginSessionRepository loginSessionRepository;
    private final ChatSessionRepository chatSessionRepository;
    private final TimetableRepository timetableRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final MemoRepository memoRepository;
    private final InboundEmailRepository inboundEmailRepository;
    private final UploadSessionRepository uploadSessionRepository;
    private final ScheduleService scheduleService;
    private final FileService fileService;

    // 매일 새벽 4시에 한 번씩 확인
    @Scheduled(cron = "0 0 4 * * *")
    public void purgeExpiredAccounts() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        List<User> expired = userRepository.findByDeletionRequestedAtBefore(cutoff);
        if (expired.isEmpty()) return;

        for (User user : expired) {
            try {
                purgeOne(user.getId());
            } catch (Exception e) {
                log.error("회원탈퇴 데이터 정리 실패 (userId={}): {}", user.getId(), e.getMessage(), e);
            }
        }
        log.info("탈퇴 요청 후 {}일 지난 계정 {}개 정리함", RETENTION_DAYS, expired.size());
    }

    @Transactional
    public void purgeOne(String userId) {
        loginSessionRepository.deleteAll(loginSessionRepository.findByUserId(userId));
        chatSessionRepository.deleteAll(chatSessionRepository.findByUserIdOrderByLastActiveAtDesc(userId));
        scheduleService.deleteAllSchedulesForUser(userId); // 톡캘린더 이벤트 삭제까지 포함
        timetableRepository.deleteAll(timetableRepository.findByUserId(userId));
        notificationRepository.deleteAll(notificationRepository.findByUserId(userId));
        notificationLogRepository.deleteAll(notificationLogRepository.findByUserId(userId));
        memoRepository.deleteAll(memoRepository.findByUserIdOrderByCreatedAtAsc(userId));
        inboundEmailRepository.deleteAll(inboundEmailRepository.findByUserId(userId));
        fileService.deleteAllFilesForUser(userId); // DB 전부 + 디스크 디렉토리 재귀 삭제
        uploadSessionRepository.deleteAll(uploadSessionRepository.findByUserId(userId));

        userRepository.deleteById(userId);
    }
}
