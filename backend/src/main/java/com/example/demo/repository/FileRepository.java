package com.example.demo.repository;

import com.example.demo.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, String> {

    // 루트 파일/폴더 조회 (parentId가 null인 것)
    List<FileEntity> findByUserIdAndParentIsNull(String userId);

    // 특정 폴더 안의 파일/폴더 조회
    List<FileEntity> findByUserIdAndParentId(String userId, String parentId);

    // 즐겨찾기만 조회
    List<FileEntity> findByUserIdAndIsFavoriteTrue(String userId);

    // 파일명 검색
    List<FileEntity> findByUserIdAndNameContaining(String userId, String name);

    // 출처별 조회(NAS 사이드바의 이메일/챗봇/업로드 구분용) - 최신순, 폴더 구조와 무관하게 전부
    List<FileEntity> findByUserIdAndSourceOrderByCreatedAtDesc(String userId, FileEntity.FileSource source);

    // "업로드" 분류는 source=UPLOAD인 파일뿐 아니라, 이 분류 기능이 생기기 전부터 있던
    // source가 NULL인 기존 파일도 같이 보여준다 (예전엔 전부 수동 업로드였으므로)
    @Query("SELECT f FROM FileEntity f WHERE f.user.id = :userId " +
            "AND (f.source IS NULL OR f.source = :source) ORDER BY f.createdAt DESC")
    List<FileEntity> findUploadSourceByUserId(@Param("userId") String userId, @Param("source") FileEntity.FileSource source);
}
