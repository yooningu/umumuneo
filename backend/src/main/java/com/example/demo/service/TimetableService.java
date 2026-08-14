package com.example.demo.service;

import com.example.demo.dto.request.TimetableRequest;
import com.example.demo.dto.response.TimetableResponse;
import com.example.demo.entity.Timetable;
import com.example.demo.entity.User;
import com.example.demo.repository.TimetableRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.ColorUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final UserRepository userRepository;
    private final ColorUtil colorUtil;

    // 시간표 전체 조회
    @Transactional(readOnly = true)
    public List<TimetableResponse> getTimetables(String userId) {
        return timetableRepository.findByUserId(userId)
                .stream()
                .map(TimetableResponse::new)
                .toList();
    }

    // 시간표 추가
    @Transactional
    public void createTimetable(String userId, TimetableRequest request) {
        // 시간 유효성 검증
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new RuntimeException("종료 시간은 시작 시간보다 늦어야 합니다.");
        }

        // 겹침 검증
        List<Timetable> conflicts = timetableRepository.findConflicting(
                userId,
                request.getDayOfWeek(),
                request.getStartTime(),
                request.getEndTime(),
                "none" // 새 등록이라 제외할 ID 없음
        );

        if (!conflicts.isEmpty()) {
            Timetable conflict = conflicts.get(0);
            throw new RuntimeException(
                    dayOfWeekToKorean(request.getDayOfWeek()) + "요일 " +
                    conflict.getStartTime() + "~" + conflict.getEndTime() +
                    " 시간대에 이미 등록된 시간표가 있습니다."
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        Timetable timetable = new Timetable();
        timetable.setUser(user);
        timetable.setTitle(request.getTitle());
        timetable.setDescription(request.getDescription());
        timetable.setColor(colorUtil.nextColor(user));
        timetable.setDayOfWeek(request.getDayOfWeek());
        timetable.setStartTime(request.getStartTime());
        timetable.setEndTime(request.getEndTime());
        timetable.setValidFrom(request.getValidFrom());
        timetable.setValidUntil(request.getValidUntil());

        timetableRepository.save(timetable);
    }

    // 시간표 수정
    @Transactional
    public void updateTimetable(String userId, String timetableId, TimetableRequest request) {
        Timetable timetable = findTimetable(userId, timetableId);

        // 시간 유효성 검증
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new RuntimeException("종료 시간은 시작 시간보다 늦어야 합니다.");
        }

        // 겹침 검증 (자기 자신 제외)
        List<Timetable> conflicts = timetableRepository.findConflicting(
                userId,
                request.getDayOfWeek(),
                request.getStartTime(),
                request.getEndTime(),
                timetableId
        );

        if (!conflicts.isEmpty()) {
            Timetable conflict = conflicts.get(0);
            throw new RuntimeException(
                    dayOfWeekToKorean(request.getDayOfWeek()) + "요일 " +
                    conflict.getStartTime() + "~" + conflict.getEndTime() +
                    " 시간대에 이미 등록된 시간표가 있습니다."
            );
        }

        timetable.setTitle(request.getTitle());
        timetable.setDescription(request.getDescription());
        timetable.setDayOfWeek(request.getDayOfWeek());
        timetable.setStartTime(request.getStartTime());
        timetable.setEndTime(request.getEndTime());
        timetable.setValidFrom(request.getValidFrom());
        timetable.setValidUntil(request.getValidUntil());

        timetableRepository.save(timetable);
    }

    // 시간표 삭제
    @Transactional
    public void deleteTimetable(String userId, String timetableId) {
        Timetable timetable = findTimetable(userId, timetableId);
        timetableRepository.delete(timetable);
    }

    // 시간표 조회 + 권한 확인
    private Timetable findTimetable(String userId, String timetableId) {
        Timetable timetable = timetableRepository.findById(timetableId)
                .orElseThrow(() -> new RuntimeException("시간표를 찾을 수 없습니다."));
        if (!timetable.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 시간표에 대한 권한이 없습니다.");
        }
        return timetable;
    }

    private String dayOfWeekToKorean(int day) {
        return switch (day) {
            case 0 -> "일";
            case 1 -> "월";
            case 2 -> "화";
            case 3 -> "수";
            case 4 -> "목";
            case 5 -> "금";
            case 6 -> "토";
            default -> "";
        };
    }
}
