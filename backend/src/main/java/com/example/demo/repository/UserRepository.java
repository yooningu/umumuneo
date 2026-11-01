package com.example.demo.repository;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    // kakao_id로 유저 조회
    Optional<User> findByKakaoId(Long kakaoId);

    // umumuneo.com 메일 별칭으로 유저 조회 (받은 메일의 수신 주소 앞부분과 매칭)
    Optional<User> findByEmailAlias(String emailAlias);

    boolean existsByEmailAlias(String emailAlias);

    // 탈퇴 요청한 지 cutoff 이전(예: 30일 전)인 유저들 - 실제 데이터 삭제 대상
    List<User> findByDeletionRequestedAtBefore(LocalDateTime cutoff);
}
