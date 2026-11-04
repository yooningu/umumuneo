package com.example.demo.repository;

import com.example.demo.entity.InboundEmail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface InboundEmailRepository extends JpaRepository<InboundEmail, String> {

    // 목록 화면용 - 본문은 미리보기 길이(121자, 말줄임표 붙일지 판단하려고 PREVIEW_LENGTH보다 1자 더)만큼만,
    // 첨부파일은 SIZE()로 개수만 가져와서 이메일이 몇 개든 쿼리 한 번으로 끝남 (N+1, 큰 본문 전체 로딩 둘 다 방지).
    // search가 비어있으면 전체, 있으면 보낸사람/제목/본문에서 찾음. 페이지 단위로 끊어서 가져옴.
    @Query(
            value = """
                    SELECT e.id AS id, e.fromAddress AS fromAddress, e.subject AS subject,
                           SUBSTRING(e.body, 1, 121) AS bodyPreview,
                           SIZE(e.attachments) AS attachmentCount,
                           e.receivedAt AS receivedAt,
                           e.isRead AS isRead
                    FROM InboundEmail e
                    WHERE e.user.id = :userId
                      AND (:search IS NULL OR :search = '' OR
                           LOWER(e.fromAddress) LIKE LOWER(CONCAT('%', :search, '%')) OR
                           LOWER(e.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR
                           LOWER(e.body) LIKE LOWER(CONCAT('%', :search, '%')))
                    ORDER BY e.receivedAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(e)
                    FROM InboundEmail e
                    WHERE e.user.id = :userId
                      AND (:search IS NULL OR :search = '' OR
                           LOWER(e.fromAddress) LIKE LOWER(CONCAT('%', :search, '%')) OR
                           LOWER(e.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR
                           LOWER(e.body) LIKE LOWER(CONCAT('%', :search, '%')))
                    """
    )
    Page<InboundEmailListProjection> findListViewByUserId(
            @Param("userId") String userId, @Param("search") String search, Pageable pageable);

    Optional<InboundEmail> findByIdAndUserId(String id, String userId);

    // 유저의 수신 메일 전체 조회 (회원탈퇴 시 전부 정리하는 용도)
    List<InboundEmail> findByUserId(String userId);
}
