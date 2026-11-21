package com.example.demo.controller;

import com.example.demo.dto.request.BusStopLineRequest;
import com.example.demo.dto.request.BusStopRequest;
import com.example.demo.dto.response.BusArrivalResponse;
import com.example.demo.dto.response.BusStopResponse;
import com.example.demo.dto.response.NearbyStopResponse;
import com.example.demo.dto.response.StopRouteResponse;
import com.example.demo.service.BusStopService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bus")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
public class BusController {

    private final BusStopService busStopService;

    // GET /api/v1/bus/stops/nearby?lat=&lon= (GPS) 또는 ?address= (주소 문자열) - 즐겨찾기 등록 전,
    // 주변 정류장 후보 검색. GPS 권한이 없는 환경을 위해 둘 중 하나만 주면 됨
    @GetMapping("/stops/nearby")
    public ResponseEntity<List<NearbyStopResponse>> findNearbyStops(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lon,
            @RequestParam(required = false) String address
    ) throws Exception {
        if (address != null && !address.isBlank()) {
            return ResponseEntity.ok(busStopService.findNearbyByAddress(address));
        }
        if (lat == null || lon == null) {
            throw new IllegalArgumentException("lat/lon 또는 address 중 하나는 있어야 합니다.");
        }
        return ResponseEntity.ok(busStopService.findNearby(lat, lon));
    }

    // GET /api/v1/bus/stops/routes?cityCode=&nodeId= - 즐겨찾기 등록 전, 정류장을 지나는 노선 목록
    @GetMapping("/stops/routes")
    public ResponseEntity<List<StopRouteResponse>> getRoutesForStop(
            @RequestParam String cityCode,
            @RequestParam String nodeId
    ) throws Exception {
        return ResponseEntity.ok(busStopService.getRoutesForStop(cityCode, nodeId));
    }

    // GET /api/v1/bus/my-stops - 내가 즐겨찾는 정류장 목록 (각 정류장이 추적 중인 노선들 포함)
    @GetMapping("/my-stops")
    public ResponseEntity<List<BusStopResponse>> getMyStops(
            @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(busStopService.getMyStops(userId));
    }

    // POST /api/v1/bus/my-stops - 정류장 즐겨찾기 등록
    @PostMapping("/my-stops")
    public ResponseEntity<BusStopResponse> addStop(
            @AuthenticationPrincipal String userId,
            @RequestBody BusStopRequest request
    ) {
        return ResponseEntity.ok(busStopService.addStop(userId, request));
    }

    // DELETE /api/v1/bus/my-stops/{stopId} - 정류장 즐겨찾기 해제 (안에 등록된 노선들도 같이 삭제됨)
    @DeleteMapping("/my-stops/{stopId}")
    public ResponseEntity<Void> removeStop(
            @AuthenticationPrincipal String userId,
            @PathVariable String stopId
    ) {
        busStopService.removeStop(userId, stopId);
        return ResponseEntity.ok().build();
    }

    // GET /api/v1/bus/my-stops/{stopId}/arrivals - 그 정류장의 실시간 도착정보
    @GetMapping("/my-stops/{stopId}/arrivals")
    public ResponseEntity<List<BusArrivalResponse>> getArrivals(
            @AuthenticationPrincipal String userId,
            @PathVariable String stopId
    ) throws Exception {
        return ResponseEntity.ok(busStopService.getArrivals(userId, stopId));
    }

    // POST /api/v1/bus/my-stops/{stopId}/lines - 그 정류장에서 챙겨볼 노선 추가
    @PostMapping("/my-stops/{stopId}/lines")
    public ResponseEntity<BusStopResponse> addLine(
            @AuthenticationPrincipal String userId,
            @PathVariable String stopId,
            @RequestBody BusStopLineRequest request
    ) {
        return ResponseEntity.ok(busStopService.addLine(userId, stopId, request));
    }

    // DELETE /api/v1/bus/my-stops/{stopId}/lines/{lineId} - 추적 중인 노선 제거
    @DeleteMapping("/my-stops/{stopId}/lines/{lineId}")
    public ResponseEntity<Void> removeLine(
            @AuthenticationPrincipal String userId,
            @PathVariable String stopId,
            @PathVariable String lineId
    ) {
        busStopService.removeLine(userId, stopId, lineId);
        return ResponseEntity.ok().build();
    }
}
