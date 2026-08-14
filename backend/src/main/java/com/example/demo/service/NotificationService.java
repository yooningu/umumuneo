package com.example.demo.service;

import com.example.demo.dto.response.NotificationResponse;
import com.example.demo.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// 알림 발송(카카오톡 "나에게 보내기")은 더 이상 여기서 하지 않음.
// 알림 = 톡캘린더 등록으로 대체되어 카카오 캘린더 자체 리마인더가 알려주기 때문
// (KakaoCalendarService, ScheduleService 참고).
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // 알림 목록 조회
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId) {
        return notificationRepository.findByUserId(userId)
                .stream()
                .map(NotificationResponse::new)
                .toList();
    }
}
