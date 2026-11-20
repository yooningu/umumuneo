package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

// 즐겨찾는 정류장(UserBusStop) 안에서, 그중에서도 챙겨볼 노선 하나하나 - 같은 정류장이어도
// 8번은 5분 전, 103번은 10분 전처럼 노선마다 알림 기준을 따로 둘 수 있음(alarmMinutes).
// 알림을 실제로 보내는 스케줄러/발송 로직은 아직 없고, 지금은 설정값만 저장해두는 단계
@Entity
@Table(name = "user_bus_stop_lines")
@Getter
@Setter
@NoArgsConstructor
public class UserBusStopLine {

    @Id
    @UuidGenerator
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_bus_stop_id", nullable = false)
    private UserBusStop userBusStop;

    // TAGO 노선 ID - 특정노선버스 도착예정정보 조회(BusService.getTagoArrivalsForRoute)에 그대로 씀
    @Column(name = "route_id", length = 30, nullable = false)
    private String routeId;

    // 버스 노선 번호(예: "8", "103") - 화면에 표시용으로 등록 시점에 캐싱
    @Column(name = "line_no", length = 20, nullable = false)
    private String lineNo;

    // 몇 분 이하로 남았을 때 알림을 보낼지 - null이면 알림 꺼짐(그냥 목록에만 추적)
    @Column(name = "alarm_minutes")
    private Integer alarmMinutes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
