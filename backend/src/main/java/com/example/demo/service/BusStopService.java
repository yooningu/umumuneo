package com.example.demo.service;

import com.example.demo.dto.request.BusStopLineRequest;
import com.example.demo.dto.request.BusStopRequest;
import com.example.demo.dto.response.BusArrivalResponse;
import com.example.demo.dto.response.BusStopResponse;
import com.example.demo.dto.response.NearbyStopResponse;
import com.example.demo.dto.response.StopRouteResponse;
import com.example.demo.entity.User;
import com.example.demo.entity.UserBusStop;
import com.example.demo.entity.UserBusStopLine;
import com.example.demo.repository.UserBusStopLineRepository;
import com.example.demo.repository.UserBusStopRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// 유저가 즐겨찾는 버스 정류장(UserBusStop)과, 그 안에서 챙겨보는 노선(UserBusStopLine)을 관리.
// 실제 "주변 정류장 검색"/"경유노선 조회"/"도착정보 조회"는 BusService(TAGO 연동)에 맡기고,
// 여기는 그 결과를 유저별로 저장/조합하는 역할만 함
@Service
@RequiredArgsConstructor
public class BusStopService {

    private final BusService busService;
    private final UserRepository userRepository;
    private final UserBusStopRepository userBusStopRepository;
    private final UserBusStopLineRepository userBusStopLineRepository;

    // 내 주변 정류장 검색 (아직 즐겨찾기 등록 전 - 그냥 후보 목록)
    public List<NearbyStopResponse> findNearby(double lat, double lon) throws Exception {
        return busService.findNearbyStops(lat, lon).stream().map(NearbyStopResponse::new).toList();
    }

    // 정류장을 지나는 노선 목록 (즐겨찾기에 추가할 노선 선택용)
    public List<StopRouteResponse> getRoutesForStop(String cityCode, String nodeId) throws Exception {
        return busService.getRoutesForStop(cityCode, nodeId).stream().map(StopRouteResponse::new).toList();
    }

    @Transactional(readOnly = true)
    public List<BusStopResponse> getMyStops(String userId) {
        return userBusStopRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(BusStopResponse::new)
                .toList();
    }

    @Transactional
    public BusStopResponse addStop(String userId, BusStopRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        UserBusStop stop = new UserBusStop();
        stop.setUser(user);
        stop.setNodeId(request.getNodeId());
        stop.setCityCode(request.getCityCode());
        stop.setStopName(request.getStopName());
        stop.setNickname(request.getNickname());
        stop.setLatitude(request.getLatitude());
        stop.setLongitude(request.getLongitude());
        userBusStopRepository.save(stop);
        return new BusStopResponse(stop);
    }

    @Transactional
    public void removeStop(String userId, String stopId) {
        UserBusStop stop = userBusStopRepository.findByIdAndUserId(stopId, userId)
                .orElseThrow(() -> new RuntimeException("정류장을 찾을 수 없습니다."));
        userBusStopRepository.delete(stop);
    }

    @Transactional
    public BusStopResponse addLine(String userId, String stopId, BusStopLineRequest request) {
        UserBusStop stop = userBusStopRepository.findByIdAndUserId(stopId, userId)
                .orElseThrow(() -> new RuntimeException("정류장을 찾을 수 없습니다."));

        UserBusStopLine line = new UserBusStopLine();
        line.setUserBusStop(stop);
        line.setRouteId(request.getRouteId());
        line.setLineNo(request.getLineNo());
        line.setAlarmMinutes(request.getAlarmMinutes());
        stop.getLines().add(line);
        userBusStopLineRepository.save(line);
        return new BusStopResponse(stop);
    }

    @Transactional
    public void removeLine(String userId, String stopId, String lineId) {
        UserBusStopLine line = userBusStopLineRepository.findByIdAndUserBusStopIdAndUserBusStopUserId(lineId, stopId, userId)
                .orElseThrow(() -> new RuntimeException("노선을 찾을 수 없습니다."));
        userBusStopLineRepository.delete(line);
    }

    // 즐겨찾는 정류장 하나의 실시간 도착정보 (전체 노선) - TAGO에 cityCode+nodeId로 그대로 위임
    public List<BusArrivalResponse> getArrivals(String userId, String stopId) throws Exception {
        UserBusStop stop = userBusStopRepository.findByIdAndUserId(stopId, userId)
                .orElseThrow(() -> new RuntimeException("정류장을 찾을 수 없습니다."));
        return busService.getTagoArrivals(stop.getCityCode(), stop.getNodeId()).stream()
                .map(BusArrivalResponse::new).toList();
    }
}
