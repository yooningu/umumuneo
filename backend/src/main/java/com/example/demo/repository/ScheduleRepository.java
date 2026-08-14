package com.example.demo.repository;

import com.example.demo.entity.Schedule;
import com.example.demo.entity.Schedule.ScheduleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, String> {

    // 날짜 범위로 일정 조회
    List<Schedule> findByUserIdAndStartDateBetween(
            String userId,
            LocalDate from,
            LocalDate to
    );

    // 날짜 범위 + 유형으로 일정 조회
    List<Schedule> findByUserIdAndStartDateBetweenAndType(
            String userId,
            LocalDate from,
            LocalDate to,
            ScheduleType type
    );

    // 기간 일정 조회 (PERIOD 타입은 end_date 기준도 필요)
    List<Schedule> findByUserIdAndTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            String userId,
            ScheduleType type,
            LocalDate to,
            LocalDate from
    );
}
