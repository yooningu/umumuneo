package com.example.demo.repository;

import com.example.demo.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, String> {

    // 유저의 시간표 전체 조회
    List<Timetable> findByUserId(String userId);
}
