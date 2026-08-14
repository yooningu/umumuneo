package com.example.demo.service;

import com.example.demo.dto.request.UserRequest;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // umumuneo.com 메일 별칭 형식: 영소문자/숫자만, 3~20자 (이메일 주소 앞부분이라 특수문자 최대한 배제)
    private static final Pattern EMAIL_ALIAS_PATTERN = Pattern.compile("^[a-z0-9]{3,20}$");

    // 내 정보 조회
    @Transactional(readOnly = true)
    public UserResponse getMe(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
        return new UserResponse(user);
    }

    // 내 정보 수정
    @Transactional
    public void updateMe(String userId, UserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        if (request.getNickname() != null) user.setNickname(request.getNickname());
        if (request.getNotifOffsetMin() != null) user.setNotifOffsetMin(request.getNotifOffsetMin());
        if (request.getNotifEnabled() != null) user.setNotifEnabled(request.getNotifEnabled());
        if (request.getTheme() != null) user.setTheme(request.getTheme());

        if (request.getEmailAlias() != null) {
            String alias = request.getEmailAlias().trim().toLowerCase();
            if (!EMAIL_ALIAS_PATTERN.matcher(alias).matches()) {
                throw new RuntimeException("이메일 별칭은 영소문자/숫자 3~20자여야 합니다.");
            }
            if (!alias.equals(user.getEmailAlias()) && userRepository.existsByEmailAlias(alias)) {
                throw new RuntimeException("이미 사용 중인 이메일 별칭입니다.");
            }
            user.setEmailAlias(alias);
        }

        userRepository.save(user);
    }
}
