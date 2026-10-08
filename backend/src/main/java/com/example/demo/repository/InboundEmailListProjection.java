package com.example.demo.repository;

import java.time.LocalDateTime;

// 메일 목록 조회 전용 프로젝션 - 미리보기에 필요한 것만 담아서, 큰 본문(MEDIUMTEXT) 전체나
// 첨부파일 컬렉션을 건건이 추가 쿼리로 불러오는 일(N+1) 없이 한 번의 쿼리로 끝내기 위함
public interface InboundEmailListProjection {
    String getId();
    String getFromAddress();
    String getSubject();
    String getBodyPreview();
    long getAttachmentCount();
    LocalDateTime getReceivedAt();
}
