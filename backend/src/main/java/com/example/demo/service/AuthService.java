package com.example.demo.service;

import com.example.demo.dto.response.AuthResponse;
import com.example.demo.entity.User;
import com.example.demo.exception.InvalidRefreshTokenException;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.JwtUtil;
import com.example.demo.util.KakaoClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final KakaoClient kakaoClient;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final KakaoNotificationService kakaoNotificationService;

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    // 미니피시(음성 비서)용 고정 토큰은 이 계정으로만 발급 가능 - 다른 계정은 access/refresh만 사용
    private static final String DEVICE_TOKEN_OWNER_ID = "11ba7325-dab5-42dd-a4a3-66cb97eabd57";

    // 카카오 로그인
    @Transactional
    public AuthResponse.Login kakaoLogin(String code) {
        // 1. 인가코드 → 카카오 토큰 발급
        Map<String, Object> tokens = kakaoClient.getTokens(code);
        String kakaoAccessToken = tokens != null ? (String) tokens.get("access_token") : null;
        String kakaoRefreshToken = tokens != null ? (String) tokens.get("refresh_token") : null;

        if (kakaoAccessToken == null) {
            throw new RuntimeException("카카오 액세스 토큰 발급에 실패했습니다.");
        }

        // 2. 카카오 액세스 토큰 → 사용자 정보
        Map<String, Object> userInfo = kakaoClient.getUserInfo(kakaoAccessToken);
        Long kakaoId = Long.valueOf(userInfo.get("id").toString());

        String nickname = "카카오 사용자";
        Map<String, Object> kakaoAccount = (Map<String, Object>) userInfo.get("kakao_account");
        if (kakaoAccount != null && kakaoAccount.containsKey("profile")) {
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
            if (profile != null && profile.get("nickname") != null) {
                nickname = (String) profile.get("nickname");
            }
        }

        final String finalNickname = nickname;

        // 3. DB에서 유저 조회 (없으면 새로 생성)
        User user = userRepository.findByKakaoId(kakaoId)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setKakaoId(kakaoId);
                    newUser.setNickname(finalNickname);
                    // emailAlias는 여기서 안 만듦 - 최초 로그인 후 프론트에서 직접 입력받아서 설정함
                    return userRepository.save(newUser);
                });

        user.setKakaoAccessToken(kakaoAccessToken);
        if (kakaoRefreshToken != null) {
            user.setKakaoRefreshToken(kakaoRefreshToken);
        }
        user.setNickname(finalNickname);

        // 4. 자체 JWT 토큰 생성
        String accessToken = jwtUtil.generateAccessToken(user.getId());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        userRepository.save(user);

        // 5. 필요한 스코프(talk_message, talk_calendar) 동의 여부 확인
        List<String> agreedScopes = kakaoClient.getAgreedScopes(kakaoAccessToken);
        boolean talkMessageAgreed = agreedScopes.contains("talk_message");
        boolean talkCalendarAgreed = agreedScopes.contains("talk_calendar");
        boolean allAgreed = talkMessageAgreed && talkCalendarAgreed;
        System.out.println("=== [카카오 동의 확인] 유저 동의 스코프: " + agreedScopes
                + " | talk_message: " + talkMessageAgreed + " | talk_calendar: " + talkCalendarAgreed + " ===");
        String agreementUrl = null;

        if (!allAgreed) {
            agreementUrl = String.format(
                    "https://kauth.kakao.com/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=talk_message,talk_calendar&prompt=consent",
                    kakaoClientId, kakaoRedirectUri
            );
        }

        // 6. 로그인 감지 알림 - "나에게 보내기"로 즉시 발송 (실패해도 로그인 자체는 계속 진행)
        //    talk_message 동의가 안 돼있으면 못 보내니 그 경우엔 조용히 건너뜀
        if (talkMessageAgreed) {
            try {
                String time = LocalDateTime.now().format(DateTimeFormatter.ofPattern("MM/dd HH:mm"));
                kakaoNotificationService.sendText(user, "로그인이 감지되었습니다.\n(" + time + ")");
            } catch (Exception e) {
                log.warn("로그인 감지 알림 발송 실패: {}", e.getMessage());
            }
        }

        // talkMessageAgreed 필드는 "필요한 카카오 동의(메시지+캘린더)를 모두 마쳤는지"를 의미함
        return new AuthResponse.Login(accessToken, refreshToken, allAgreed, agreementUrl, agreedScopes);
    }

    // Access Token 재발급
    public AuthResponse.TokenRefresh refresh(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new InvalidRefreshTokenException("유효하지 않은 Refresh Token입니다.");
        }
        if (!"refresh".equals(jwtUtil.getTokenType(refreshToken))) {
            throw new InvalidRefreshTokenException("Refresh Token이 아닙니다.");
        }
        String userId = jwtUtil.getUserId(refreshToken);
        String newAccessToken = jwtUtil.generateAccessToken(userId);
        return new AuthResponse.TokenRefresh(newAccessToken);
    }

    // 미니피시(음성 비서)용 고정 토큰 발급 - 지정된 계정 본인만 발급 가능
    public AuthResponse.DeviceToken generateDeviceToken(String userId) {
        if (!DEVICE_TOKEN_OWNER_ID.equals(userId)) {
            throw new RuntimeException("이 계정은 고정 토큰을 발급할 수 없습니다.");
        }
        return new AuthResponse.DeviceToken(jwtUtil.generateDeviceToken(userId));
    }

    // 로그아웃
    @Transactional
    public void logout(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
        user.setKakaoRefreshToken(null);
        userRepository.save(user);
    }
}
