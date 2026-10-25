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

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        Timetable timetable = new Timetable();
        timetable.setUser(user);
        timetable.setTitle(request.getTitle());
        timetable.setColor(colorUtil.nextColor(user));
        timetable.setDayOfWeek(request.getDayOfWeek());
        timetable.setStartTime(request.getStartTime());
        timetable.setEndTime(request.getEndTime());

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

        timetable.setTitle(request.getTitle());
        timetable.setDayOfWeek(request.getDayOfWeek());
        timetable.setStartTime(request.getStartTime());
        timetable.setEndTime(request.getEndTime());

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
}
