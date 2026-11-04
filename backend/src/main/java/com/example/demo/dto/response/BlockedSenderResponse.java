package com.example.demo.dto.response;

import com.example.demo.entity.BlockedSender;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class BlockedSenderResponse {
    private final String id;
    private final String address;
    private final LocalDateTime createdAt;

    public BlockedSenderResponse(BlockedSender b) {
        this.id = b.getId();
        this.address = b.getAddress();
        this.createdAt = b.getCreatedAt();
    }
}
