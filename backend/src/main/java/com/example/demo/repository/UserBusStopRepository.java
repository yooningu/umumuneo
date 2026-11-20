package com.example.demo.repository;

import com.example.demo.entity.UserBusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBusStopRepository extends JpaRepository<UserBusStop, String> {

    List<UserBusStop> findByUserIdOrderByCreatedAtAsc(String userId);

    // 소유자 확인까지 같이 - 남의 정류장을 id만 알아서 건드리는 걸 막음
    Optional<UserBusStop> findByIdAndUserId(String id, String userId);
}
