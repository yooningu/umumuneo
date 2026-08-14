package com.example.demo.repository;

import com.example.demo.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, String> {

    // 유저의 시간표 전체 조회
    List<Timetable> findByUserId(String userId);

    // 같은 요일에 시간 겹치는 시간표 조회 (겹침 검증용)
    @Query("SELECT t FROM Timetable t WHERE t.user.id = :userId " +
           "AND t.dayOfWeek = :dayOfWeek " +
           "AND t.id != :excludeId " +
           "AND t.startTime < :endTime " +
           "AND t.endTime > :startTime")
    List<Timetable> findConflicting(
            @Param("userId") String userId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") String excludeId
    );
}
