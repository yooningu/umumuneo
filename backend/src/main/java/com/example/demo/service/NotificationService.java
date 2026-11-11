package com.example.demo.service;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.entity.Notification;
import com.example.demo.entity.NotificationLog;
import com.example.demo.entity.Schedule;
import com.example.demo.entity.User;
import com.example.demo.repository.NotificationLogRepository;
import com.example.demo.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

// 알림 발송 - 톡캘린더 등록(KakaoCalendarService, ScheduleService.createNotification)과 별개로
// 여기서 카카오톡 "나에게 보내기"로도 직접 보낸다. 톡캘린더 자체 리마인더는 사업자 인증 없이는
// 앱 개발자 본인 계정에서만 동작해서(카카오 정책), 실제로 알림이 오게 하려면 이 "나에게 보내기"
// 쪽이 꼭 필요함 - 그래서 캘린더 등록 + 나에게 보내기 둘 다 함.
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationRepository notificationRepository;
    private final NotificationLogRepository notificationLogRepository;
    private final KakaoNotificationService kakaoNotificationService;

    // 알림 목록 조회
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId) {
        return notificationRepository.findByUserId(userId)
                .stream()
                .map(NotificationResponse::new)
                .toList();
    }

    // 1분마다 발송 시각이 지났는데 아직 안 보낸 알림을 찾아서 카카오톡 "나에게 보내기"로 보냄
    @Scheduled(fixedRate = 60 * 1000)
    @Transactional
    public void dispatchDueNotifications() {
        List<Notification> due = notificationRepository.findByNotifyAtBeforeAndIsSentFalse(LocalDateTime.now());
        for (Notification notification : due) {
            send(notification);
        }
    }

    private void send(Notification notification) {
        User user = notification.getUser();
        Schedule schedule = notification.getSchedule();

        NotificationLog logEntry = new NotificationLog();
        logEntry.setNotification(notification);
        logEntry.setUser(user);

        try {
            kakaoNotificationService.sendText(user, buildMessage(schedule));
            notification.setIsSent(true);
            logEntry.setStatus(NotificationLog.NotifStatus.SUCCESS);
        } catch (Exception e) {
            // isSent를 true로 안 바꿔서 다음 1분 뒤에 다시 시도됨 (토큰 만료처럼 일시적인 문제일 수 있어서)
            logEntry.setStatus(NotificationLog.NotifStatus.FAIL);
            logEntry.setErrorMessage(e.getMessage());
            log.error("알림 발송 실패 (notificationId={}, scheduleId={}): {}",
                    notification.getId(), schedule.getId(), e.getMessage());
        }

        notificationRepository.save(notification);
        notificationLogRepository.save(logEntry);
    }

    private String buildMessage(Schedule schedule) {
        StringBuilder sb = new StringBuilder("⏰ ").append(schedule.getTitle());
        if (schedule.getStartTime() != null) {
            sb.append(" (").append(schedule.getStartTime().format(TIME_FORMAT)).append(")");
        }
        sb.append(" 일정 알림이에요!");
        return sb.toString();
    }
}
