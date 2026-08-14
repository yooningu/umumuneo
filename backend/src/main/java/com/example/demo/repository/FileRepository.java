package com.example.demo.repository;

import com.example.demo.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
