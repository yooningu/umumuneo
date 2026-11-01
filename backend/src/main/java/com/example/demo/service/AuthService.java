package com.example.demo.service;

import com.example.demo.dto.response.AuthResponse;
import com.example.demo.entity.LoginSession;
import com.example.demo.entity.User;
import com.example.demo.exception.InvalidRefreshTokenException;
import com.example.demo.repository.LoginSessionRepository;
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
    private final LoginSessionRepository loginSessionRepository;
    private final JwtUtil jwtUtil;
    private final KakaoNotificationService kakaoNotificationService;

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    // 미니피시(음성 비서)용 고정 토큰은 이 계정으로만 발급 가능 - 다른 계정은 access/refresh만 사용.
    // 실제 값은 커밋하지 않고 .env(gitignore됨) -> docker-compose 환경변수로 주입함
    @Value("${device.token-owner-id}")
    private String deviceTokenOwnerId;

    // 카카오 로그인
    @Transactional
    public AuthResponse.Login kakaoLogin(String code, boolean rememberMe, String userAgent) {
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

        if (user.getDeletionRequestedAt() != null) {
            throw new RuntimeException("탈퇴 처리 중인 계정입니다. 문의가 필요하면 관리자에게 연락해주세요.");
        }

        user.setKakaoAccessToken(kakaoAccessToken);
        if (kakaoRefreshToken != null) {
            user.setKakaoRefreshToken(kakaoRefreshToken);
        }
        user.setNickname(finalNickname);

        // 4. 로그인 세션(기기) 하나 생성 - 이 행의 id를 토큰에 jti로 심어서 나중에 이 기기만
        //    따로 로그아웃시키거나("이 기기 로그아웃"), refresh 때마다 세션이 살아있는지 확인함
        LoginSession session = new LoginSession();
        session.setUser(user);
        session.setDeviceLabel(parseDeviceLabel(userAgent));
        session.setRememberMe(rememberMe);
        session = loginSessionRepository.save(session);

        // 5. 자체 JWT 토큰 생성 ("로그인 상태 유지" 체크했으면 refresh token은 만료시간 없이)
        String accessToken = jwtUtil.generateAccessToken(user.getId(), session.getId());
        String refreshToken = rememberMe
                ? jwtUtil.generatePersistentRefreshToken(user.getId(), session.getId())
                : jwtUtil.generateRefreshToken(user.getId(), session.getId());

        userRepository.save(user);

        // 6. 필요한 스코프(talk_message, talk_calendar) 동의 여부 확인
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

        // 7. 로그인 감지 알림 - "나에게 보내기"로 즉시 발송 (실패해도 로그인 자체는 계속 진행)
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
    @Transactional
    public AuthResponse.TokenRefresh refresh(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new InvalidRefreshTokenException("유효하지 않은 Refresh Token입니다.");
        }
        if (!"refresh".equals(jwtUtil.getTokenType(refreshToken))) {
            throw new InvalidRefreshTokenException("Refresh Token이 아닙니다.");
        }
        String userId = jwtUtil.getUserId(refreshToken);
        String sessionId = jwtUtil.getSessionId(refreshToken);

        // 세션이 그 사이에 지워졌으면(다른 기기에서 "이 기기 로그아웃" 눌렀거나 전체 로그아웃)
        // 서명은 멀쩡해도 더 이상 유효하지 않은 걸로 취급 - 이게 실제 원격 로그아웃이 동작하는 지점.
        // (이 변경 전에 발급된 토큰은 세션 id가 없어서 여기서 막히고 한 번 재로그인하게 됨)
        LoginSession session = loginSessionRepository.findById(sessionId == null ? "" : sessionId)
                .filter(s -> s.getUser().getId().equals(userId))
                .orElseThrow(() -> new InvalidRefreshTokenException("로그아웃된 세션입니다. 다시 로그인해주세요."));

        session.setLastUsedAt(LocalDateTime.now());
        loginSessionRepository.save(session);

        String newAccessToken = jwtUtil.generateAccessToken(userId, sessionId);
        return new AuthResponse.TokenRefresh(newAccessToken);
    }

    // 로그인된 기기(세션) 목록 - 최근 활동 순. currentSessionId와 같은 행에 isCurrent 표시
    @Transactional(readOnly = true)
    public List<AuthResponse.SessionInfo> listSessions(String userId, String currentSessionId) {
        return loginSessionRepository.findByUserIdOrderByLastUsedAtDesc(userId).stream()
                .map(s -> new AuthResponse.SessionInfo(
                        s.getId(),
                        s.getDeviceLabel(),
                        s.getRememberMe(),
                        s.getCreatedAt(),
                        s.getLastUsedAt(),
                        s.getId().equals(currentSessionId)
                ))
                .toList();
    }

    // 세션(기기) 하나를 원격 로그아웃 - 그 기기의 refresh token은 다음 갱신 시도부터 즉시 막힘
    @Transactional
    public void revokeSession(String userId, String sessionId) {
        LoginSession session = loginSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        loginSessionRepository.delete(session);
    }

    // 모든 기기에서 로그아웃 (지금 요청 중인 기기 포함)
    @Transactional
    public void revokeAllSessions(String userId) {
        loginSessionRepository.deleteAll(loginSessionRepository.findByUserId(userId));
    }

    // User-Agent로 "Chrome · Windows" 같은 표시용 라벨을 대충 추정 - 정확한 기기 인식이 목적이 아니라
    // 목록에서 기기를 구분하기 위한 용도라 흔한 브라우저/OS 몇 가지만 체크함
    private String parseDeviceLabel(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) return "알 수 없는 기기";

        String browser;
        if (userAgent.contains("Edg/")) browser = "Edge";
        else if (userAgent.contains("Chrome/")) browser = "Chrome";
        else if (userAgent.contains("Firefox/")) browser = "Firefox";
        else if (userAgent.contains("Safari/")) browser = "Safari";
        else browser = "브라우저";

        String os;
        if (userAgent.contains("Windows")) os = "Windows";
        else if (userAgent.contains("Mac OS")) os = "macOS";
        else if (userAgent.contains("Android")) os = "Android";
        else if (userAgent.contains("iPhone") || userAgent.contains("iPad")) os = "iOS";
        else if (userAgent.contains("Linux")) os = "Linux";
        else os = "알 수 없는 OS";

        return browser + " · " + os;
    }

    // 미니피시(음성 비서)용 고정 토큰 발급 - 지정된 계정 본인만 발급 가능
    public AuthResponse.DeviceToken generateDeviceToken(String userId) {
        if (!deviceTokenOwnerId.equals(userId)) {
            throw new RuntimeException("이 계정은 고정 토큰을 발급할 수 없습니다.");
        }
        return new AuthResponse.DeviceToken(jwtUtil.generateDeviceToken(userId));
    }

    // 로그아웃 (지금 로그인한 기기 하나만)
    @Transactional
    public void logout(String userId, String sessionId) {
        if (sessionId != null) {
            loginSessionRepository.findByIdAndUserId(sessionId, userId)
                    .ifPresent(loginSessionRepository::delete);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
        user.setKakaoRefreshToken(null);
        userRepository.save(user);
    }
}
