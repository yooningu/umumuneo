package com.example.demo.repository;

import com.example.demo.entity.UserBusStopLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserBusStopLineRepository extends JpaRepository<UserBusStopLine, String> {

    // 소유자 확인까지 같이 - 남의 정류장에 걸린 노선을 건드리는 걸 막음
    Optional<UserBusStopLine> findByIdAndUserBusStopIdAndUserBusStopUserId(String id, String stopId, String userId);
}
