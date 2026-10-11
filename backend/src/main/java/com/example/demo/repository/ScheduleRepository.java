package com.example.demo.repository;

import com.example.demo.entity.Schedule;
import com.example.demo.entity.Schedule.ScheduleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, String> {

    // 날짜 범위로 일정 조회 (반복 일정은 규칙만 저장돼 있어 별도로 findByUserIdAndRepeatRuleIsNotNull로 가져와 계산함)
    List<Schedule> findByUserIdAndStartDateBetweenAndRepeatRuleIsNull(
            String userId,
            LocalDate from,
            LocalDate to
    );

    // 날짜 범위 + 유형으로 일정 조회
    List<Schedule> findByUserIdAndStartDateBetweenAndTypeAndRepeatRuleIsNull(
            String userId,
            LocalDate from,
            LocalDate to,
            ScheduleType type
    );

    // 기간 일정 조회 (PERIOD 타입은 end_date 기준도 필요)
    List<Schedule> findByUserIdAndTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndRepeatRuleIsNull(
            String userId,
            ScheduleType type,
            LocalDate to,
            LocalDate from
    );

    // 반복 일정 전부 조회 (발생일 계산은 서비스 레이어에서)
    List<Schedule> findByUserIdAndRepeatRuleIsNotNull(String userId);
}
