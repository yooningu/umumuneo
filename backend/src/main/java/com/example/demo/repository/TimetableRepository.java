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

    // 묶음(groupId)에 속한 행들 조회 - 묶음 단위 수정/삭제에 씀
    List<Timetable> findByUserIdAndGroupId(String userId, String groupId);

    // 같은 요일에 시간이 겹치는 시간표 조회 (겹침 검증용).
    // excludeGroupId에 해당하는 묶음(수정 중인 자기 자신)은 겹침 대상에서 제외함
    @Query("SELECT t FROM Timetable t WHERE t.user.id = :userId " +
           "AND t.dayOfWeek = :dayOfWeek " +
           "AND (t.groupId IS NULL OR t.groupId <> :excludeGroupId) " +
           "AND t.startTime < :endTime AND t.endTime > :startTime")
    List<Timetable> findConflicting(
            @Param("userId") String userId,
            @Param("dayOfWeek") Integer dayOfWeek,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeGroupId") String excludeGroupId
    );
}
