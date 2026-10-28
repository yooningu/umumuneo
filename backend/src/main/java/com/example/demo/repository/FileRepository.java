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

    // 출처별 조회(NAS 사이드바의 이메일/챗봇/업로드 구분용) - 폴더 구조를 그대로 유지한 채로 필터링.
    // 즉 "업로드" 분류를 고르면 전부 평면으로 쏟아지는 게 아니라, 루트/폴더별로 평소처럼 탐색하되
    // 그 출처가 아닌 항목만 안 보이게 걸러낸다.
    List<FileEntity> findByUserIdAndParentIdAndSource(String userId, String parentId, FileEntity.FileSource source);

    List<FileEntity> findByUserIdAndParentIsNullAndSource(String userId, FileEntity.FileSource source);

    // "업로드" 분류는 source=UPLOAD인 것뿐 아니라, 이 분류 기능이 생기기 전부터 있던 source가
    // NULL인 기존 파일/폴더도 같이 보여준다 (예전엔 전부 수동 업로드였으므로)
    @Query("SELECT f FROM FileEntity f WHERE f.user.id = :userId AND f.parent.id = :parentId " +
            "AND (f.source IS NULL OR f.source = :source)")
    List<FileEntity> findByUserIdAndParentIdAndSourceOrNull(
            @Param("userId") String userId, @Param("parentId") String parentId, @Param("source") FileEntity.FileSource source);

    @Query("SELECT f FROM FileEntity f WHERE f.user.id = :userId AND f.parent IS NULL " +
            "AND (f.source IS NULL OR f.source = :source)")
    List<FileEntity> findByUserIdAndParentIsNullAndSourceOrNull(
            @Param("userId") String userId, @Param("source") FileEntity.FileSource source);

    // 사이드바 "사용중" 용량 표시용 - 폴더 구조와 무관하게 유저의 모든 파일(폴더 제외) 크기 합계.
    // getFiles()는 폴더 구조를 유지하려고 parentId=null이면 루트만 반환하므로, 전체 합계는 따로 집계해야 함.
    @Query("SELECT COALESCE(SUM(f.sizeBytes), 0) FROM FileEntity f WHERE f.user.id = :userId AND f.isDirectory = false")
    long sumSizeBytesByUserId(@Param("userId") String userId);
}
