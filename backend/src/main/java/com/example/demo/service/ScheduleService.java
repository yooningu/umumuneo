package com.example.demo.service;

import com.example.demo.dto.request.ScheduleRequest;
import com.example.demo.dto.response.ScheduleResponse;
import com.example.demo.entity.Notification;
import com.example.demo.entity.Schedule;
import com.example.demo.entity.Schedule.ScheduleType;
import com.example.demo.entity.User;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.ScheduleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.ColorUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ColorUtil colorUtil;
    private final KakaoCalendarService kakaoCalendarService;

    // 일정 목록 조회
    @Transactional(readOnly = true)
    public List<ScheduleResponse> getSchedules(String userId, LocalDate from, LocalDate to, ScheduleType type) {
        return findSchedulesInRange(userId, from, to, type).stream().map(ScheduleResponse::new).toList();
    }

    // 날짜 범위로 일정 삭제 (챗봇 SCHEDULE_DELETE_BY_DATE용)
    @Transactional
    public void deleteSchedulesByDate(String userId, LocalDate from, LocalDate to) {
        List<Schedule> schedules = findSchedulesInRange(userId, from, to, null);
        schedules.forEach(this::deleteKakaoEventIfAny);
        scheduleRepository.deleteAll(schedules);
    }

    // 날짜 범위 + (선택)유형으로 일정 조회 (getSchedules/deleteSchedulesByDate 공용)
    private List<Schedule> findSchedulesInRange(String userId, LocalDate from, LocalDate to, ScheduleType type) {
        List<Schedule> schedules = new ArrayList<>();

        if (type != null) {
            if (type == ScheduleType.PERIOD) {
                schedules = scheduleRepository
                        .findByUserIdAndTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                                userId, type, to, from);
            } else {
                schedules = scheduleRepository.findByUserIdAndStartDateBetweenAndType(userId, from, to, type);
            }
        } else {
            // 전체 조회 (PERIOD 포함)
            schedules.addAll(scheduleRepository.findByUserIdAndStartDateBetween(userId, from, to));
            schedules.addAll(
                    scheduleRepository.findByUserIdAndTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            userId, ScheduleType.PERIOD, to, from));
            // 중복 제거
            schedules = schedules.stream().distinct().toList();
        }

        return schedules;
    }

    // 일정 단건 조회
    @Transactional(readOnly = true)
    public ScheduleResponse getSchedule(String userId, String scheduleId) {
        Schedule schedule = findSchedule(userId, scheduleId);
        return new ScheduleResponse(schedule);
    }

    // 일정 추가
    @Transactional
    public Schedule createSchedule(String userId, ScheduleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        Schedule schedule = new Schedule();
        schedule.setUser(user);
        schedule.setType(normalizeType(request.getType(), request.getStartTime()));
        schedule.setTitle(request.getTitle());
        schedule.setDescription(request.getDescription());
        schedule.setColor(colorUtil.nextColor(user));
        schedule.setStartDate(request.getStartDate());
        schedule.setEndDate(request.getEndDate());
        schedule.setStartTime(roundUpToFiveMinutes(request.getStartTime()));
        schedule.setEndTime(roundUpToFiveMinutes(request.getEndTime()));

        scheduleRepository.save(schedule);

        // 알림 설정
        if (request.getNotifOffsetMin() != null) {
            createNotification(user, schedule, request.getNotifOffsetMin());
        }

        return schedule;
    }

    // 일정 수정
    @Transactional
    public void updateSchedule(String userId, String scheduleId, ScheduleRequest request) {
        Schedule schedule = findSchedule(userId, scheduleId);

        schedule.setType(normalizeType(request.getType(), request.getStartTime()));
        schedule.setTitle(request.getTitle());
        schedule.setDescription(request.getDescription());
        schedule.setStartDate(request.getStartDate());
        schedule.setEndDate(request.getEndDate());
        schedule.setStartTime(roundUpToFiveMinutes(request.getStartTime()));
        schedule.setEndTime(roundUpToFiveMinutes(request.getEndTime()));

        scheduleRepository.save(schedule);

        // 알림(톡캘린더 등록) 업데이트
        if (request.getNotifOffsetMin() != null) {
            if (schedule.getNotification() != null) {
                // 기존 알림 수정 -> 톡캘린더 이벤트도 같이 수정 (실패 시 새로 등록 시도)
                Notification notification = schedule.getNotification();
                notification.setOffsetMin(request.getNotifOffsetMin());
                notification.setNotifyAt(calculateNotifyAt(schedule, request.getNotifOffsetMin()));

                User user = schedule.getUser();
                if (notification.getKakaoEventId() != null) {
                    boolean updated = kakaoCalendarService.updateEvent(
                            user, notification.getKakaoEventId(), schedule, request.getNotifOffsetMin());
                    if (!updated) {
                        notification.setKakaoEventId(
                                kakaoCalendarService.createEvent(user, schedule, request.getNotifOffsetMin()));
                    }
                } else {
                    notification.setKakaoEventId(
                            kakaoCalendarService.createEvent(user, schedule, request.getNotifOffsetMin()));
                }

                notificationRepository.save(notification);
            } else {
                // 새 알림 생성
                createNotification(schedule.getUser(), schedule, request.getNotifOffsetMin());
            }
        } else {
            // 알림 삭제 (톡캘린더 이벤트도 같이 삭제)
            if (schedule.getNotification() != null) {
                deleteKakaoEventIfAny(schedule);
                notificationRepository.delete(schedule.getNotification());
            }
        }
    }

    // 일정 삭제
    @Transactional
    public void deleteSchedule(String userId, String scheduleId) {
        Schedule schedule = findSchedule(userId, scheduleId);
        deleteKakaoEventIfAny(schedule);
        scheduleRepository.delete(schedule);
    }

    // 일정에 걸린 알림이 톡캘린더에 등록돼 있으면 삭제
    private void deleteKakaoEventIfAny(Schedule schedule) {
        Notification notification = schedule.getNotification();
        if (notification != null && notification.getKakaoEventId() != null) {
            kakaoCalendarService.deleteEvent(schedule.getUser(), notification.getKakaoEventId());
        }
    }

    // 알림 생성 (+ 톡캘린더에 동일한 일정/알림 등록)
    private void createNotification(User user, Schedule schedule, int offsetMin) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setSchedule(schedule);
        notification.setOffsetMin(offsetMin);
        notification.setNotifyAt(calculateNotifyAt(schedule, offsetMin));
        notification.setIsSent(false);

        String kakaoEventId = kakaoCalendarService.createEvent(user, schedule, offsetMin);
        notification.setKakaoEventId(kakaoEventId);

        notificationRepository.save(notification);
    }

    // 알림 발송 시각 계산
    private LocalDateTime calculateNotifyAt(Schedule schedule, int offsetMin) {
        LocalDateTime baseTime;
        if (schedule.getStartTime() != null) {
            baseTime = schedule.getStartDate().atTime(schedule.getStartTime());
        } else {
            // ALLDAY, PERIOD → 당일 오전 9시 기준
            baseTime = schedule.getStartDate().atTime(9, 0);
        }
        return baseTime.minusMinutes(offsetMin);
    }

    // 모든 일정 시각은 5분 단위로 맞춘다 (예: 42분에 "10분 뒤"로 계산된 52분 -> 55분으로 올림)
    private LocalTime roundUpToFiveMinutes(LocalTime time) {
        if (time == null) return null;
        int remainder = time.getMinute() % 5;
        LocalTime rounded = remainder == 0 ? time : time.plusMinutes(5 - remainder);
        return rounded.withSecond(0).withNano(0);
    }

    // MOMENT/TIMED인데 시각이 없으면 ALLDAY로 보정 (챗봇 등이 잘못된 조합을 보내는 경우 대비)
    private ScheduleType normalizeType(ScheduleType type, LocalTime startTime) {
        if ((type == ScheduleType.MOMENT || type == ScheduleType.TIMED) && startTime == null) {
            return ScheduleType.ALLDAY;
        }
        return type;
    }

    // 일정 조회 + 권한 확인
    private Schedule findSchedule(String userId, String scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new RuntimeException("일정을 찾을 수 없습니다."));
        if (!schedule.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 일정에 대한 권한이 없습니다.");
        }
        return schedule;
    }
}
