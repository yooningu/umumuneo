package com.example.demo.repository;

import com.example.demo.entity.Memo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemoRepository extends JpaRepository<Memo, String> {
    List<Memo> findByUserIdOrderByCreatedAtAsc(String userId);
    Optional<Memo> findByIdAndUserId(String id, String userId);
}
