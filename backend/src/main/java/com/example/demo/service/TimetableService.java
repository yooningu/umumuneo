package com.example.demo.service;

import com.example.demo.dto.request.TimetableRequest;
import com.example.demo.dto.response.TimetableResponse;
import com.example.demo.entity.Timetable;
import com.example.demo.entity.User;
import com.example.demo.repository.TimetableRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final UserRepository userRepository;

    // 시간표 전체 조회
    @Transactional(readOnly = true)
    public List<TimetableResponse> getTimetables(String userId) {
        return timetableRepository.findByUserId(userId)
                .stream()
                .map(TimetableResponse::new)
                .toList();
    }

    // 시간표 묶음 추가 (요일을 여러 개 고르면 같은 groupId로 요일 수만큼 행이 생김)
    @Transactional
    public void createTimetableGroup(String userId, TimetableRequest request) {
        validateTimeRange(request);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        String groupId = UUID.randomUUID().toString();
        checkConflicts(userId, request, groupId);

        for (Integer dayOfWeek : request.getDayOfWeeks()) {
            Timetable timetable = new Timetable();
            timetable.setUser(user);
            timetable.setGroupId(groupId);
            timetable.setTitle(request.getTitle());
            timetable.setColor(request.getColor());
            timetable.setDayOfWeek(dayOfWeek);
            timetable.setStartTime(request.getStartTime());
            timetable.setEndTime(request.getEndTime());
            timetableRepository.save(timetable);
        }
    }

    // 시간표 묶음 수정 - 요일 구성이 바뀔 수 있어서, 기존 행을 지우고 같은 groupId로 다시 만든다
    @Transactional
    public void updateTimetableGroup(String userId, String groupId, TimetableRequest request) {
        List<Timetable> existing = findGroupOrSingle(userId, groupId);
        validateTimeRange(request);
        checkConflicts(userId, request, groupId);

        User user = existing.get(0).getUser();
        timetableRepository.deleteAll(existing);

        for (Integer dayOfWeek : request.getDayOfWeeks()) {
            Timetable timetable = new Timetable();
            timetable.setUser(user);
            timetable.setGroupId(groupId);
            timetable.setTitle(request.getTitle());
            timetable.setColor(request.getColor());
            timetable.setDayOfWeek(dayOfWeek);
            timetable.setStartTime(request.getStartTime());
            timetable.setEndTime(request.getEndTime());
            timetableRepository.save(timetable);
        }
    }

    // 시간표 묶음 삭제
    @Transactional
    public void deleteTimetableGroup(String userId, String groupId) {
        List<Timetable> existing = findGroupOrSingle(userId, groupId);
        timetableRepository.deleteAll(existing);
    }

    // groupId로 묶음을 찾되, 예전에 묶음 없이(groupId=null) 만들어진 데이터는
    // groupId 자리에 그 행의 id가 넘어올 수 있으니 그 경우 단일 행으로 취급
    private List<Timetable> findGroupOrSingle(String userId, String groupId) {
        List<Timetable> group = timetableRepository.findByUserIdAndGroupId(userId, groupId);
        if (!group.isEmpty()) {
            return group;
        }
        Timetable single = timetableRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("시간표를 찾을 수 없습니다."));
        if (!single.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 시간표에 대한 권한이 없습니다.");
        }
        return List.of(single);
    }

    private void validateTimeRange(TimetableRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new RuntimeException("종료 시간은 시작 시간보다 늦어야 합니다.");
        }
    }

    // 시간표는 같은 요일에 시간대가 겹치면 안 됨 (자기 자신 묶음은 제외하고 검사)
    private void checkConflicts(String userId, TimetableRequest request, String excludeGroupId) {
        for (Integer dayOfWeek : request.getDayOfWeeks()) {
            List<Timetable> conflicts = timetableRepository.findConflicting(
                    userId, dayOfWeek, request.getStartTime(), request.getEndTime(), excludeGroupId
            );
            if (!conflicts.isEmpty()) {
                Timetable conflict = conflicts.get(0);
                throw new RuntimeException(
                        dayOfWeekToKorean(dayOfWeek) + "요일 " +
                        conflict.getStartTime() + "~" + conflict.getEndTime() +
                        " 시간대에 이미 등록된 시간표가 있습니다."
                );
            }
        }
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
