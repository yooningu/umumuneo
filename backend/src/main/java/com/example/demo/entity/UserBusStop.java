package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// 유저가 즐겨찾는 버스 정류장 - 정류장 자체는 여기, 그 정류장에서 챙겨볼 노선들은
// UserBusStopLine에 따로 둬서(1:N) 정류장 하나에 여러 노선을 각자 추적할 수 있게 함
@Entity
@Table(name = "user_bus_stops")
@Getter
@Setter
@NoArgsConstructor
public class UserBusStop {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 부산 BIMS의 정류장 고유번호(ARS번호) - 도착정보 조회(BusService.getArrivals)에 그대로 씀
    @Column(name = "arsno", length = 20, nullable = false)
    private String arsno;

    // 정류장 이름 - 등록 시점에 API에서 받아온 걸 캐싱(매번 안 불러오고 목록에 바로 표시하려고)
    @Column(name = "stop_name", length = 100)
    private String stopName;

    // 유저가 직접 붙이는 별칭(예: "집 앞", "회사 앞") - 안 붙이면 stopName 그대로 보여주면 됨
    @Column(name = "nickname", length = 50)
    private String nickname;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @OneToMany(mappedBy = "userBusStop", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserBusStopLine> lines = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
