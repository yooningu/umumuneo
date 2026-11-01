package com.example.demo.repository;

import com.example.demo.entity.LoginSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoginSessionRepository extends JpaRepository<LoginSession, String> {

    // 유저의 로그인 세션(기기) 목록 - 최근 활동 순
    List<LoginSession> findByUserIdOrderByLastUsedAtDesc(String userId);

    // 소유권 확인하면서 조회 (내 세션이 맞는지 확인하고 지우는 용도)
    Optional<LoginSession> findByIdAndUserId(String id, String userId);

    // 회원탈퇴 시 전부 정리하는 용도
    List<LoginSession> findByUserId(String userId);
}
