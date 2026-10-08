package com.example.demo.repository;

import com.example.demo.entity.InboundEmail;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InboundEmailRepository extends JpaRepository<InboundEmail, String> {

    List<InboundEmail> findByUserIdOrderByReceivedAtDesc(String userId);

    Optional<InboundEmail> findByIdAndUserId(String id, String userId);
}
