package com.example.demo.repository;

import com.example.demo.entity.InboundEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InboundEmailRepository extends JpaRepository<InboundEmail, String> {

    // 목록 화면용 - 본문은 미리보기 길이(121자, 말줄임표 붙일지 판단하려고 PREVIEW_LENGTH보다 1자 더)만큼만,
    // 첨부파일은 SIZE()로 개수만 가져와서 이메일이 몇 개든 쿼리 한 번으로 끝남 (N+1, 큰 본문 전체 로딩 둘 다 방지)
    @Query("""
            SELECT e.id AS id, e.fromAddress AS fromAddress, e.subject AS subject,
                   SUBSTRING(e.body, 1, 121) AS bodyPreview,
                   SIZE(e.attachments) AS attachmentCount,
                   e.receivedAt AS receivedAt
            FROM InboundEmail e
            WHERE e.user.id = :userId
            ORDER BY e.receivedAt DESC
            """)
    List<InboundEmailListProjection> findListViewByUserId(@Param("userId") String userId);

    Optional<InboundEmail> findByIdAndUserId(String id, String userId);
}
