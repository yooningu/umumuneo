package com.example.demo.dto.response;

import com.example.demo.entity.Memo;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class MemoResponse {
    private final String id;
    private final String content;
    private final LocalDateTime updatedAt;

    public MemoResponse(Memo memo) {
        this.id = memo.getId();
        this.content = memo.getContent();
        this.updatedAt = memo.getUpdatedAt();
    }
}
