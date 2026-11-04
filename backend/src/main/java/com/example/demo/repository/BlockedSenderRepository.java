package com.example.demo.repository;

import com.example.demo.entity.BlockedSender;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BlockedSenderRepository extends JpaRepository<BlockedSender, String> {

    boolean existsByUserIdAndAddress(String userId, String address);

    // 설정 > 차단 목록 화면용 - 최근 차단한 순
    List<BlockedSender> findByUserIdOrderByCreatedAtDesc(String userId);

    Optional<BlockedSender> findByIdAndUserId(String id, String userId);

    // 회원탈퇴 시 전부 정리하는 용도
    List<BlockedSender> findByUserId(String userId);
}
