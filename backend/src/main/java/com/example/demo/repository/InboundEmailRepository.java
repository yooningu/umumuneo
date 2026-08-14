package com.example.demo.repository;

import com.example.demo.entity.InboundEmail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InboundEmailRepository extends JpaRepository<InboundEmail, String> {
}
