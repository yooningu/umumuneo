package com.example.demo.repository;

import com.example.demo.entity.EmailAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailAttachmentRepository extends JpaRepository<EmailAttachment, String> {
}
