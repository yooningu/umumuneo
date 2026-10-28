package com.example.demo.dto.response;

import lombok.Getter;

@Getter
public class ArchiveEntryResponse {

    private final String name;
    private final Long sizeBytes;
    private final boolean directory;

    public ArchiveEntryResponse(String name, Long sizeBytes, boolean directory) {
        this.name = name;
        this.sizeBytes = sizeBytes;
        this.directory = directory;
    }
}
