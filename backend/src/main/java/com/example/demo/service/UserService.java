package com.example.demo.service;

import com.example.demo.dto.request.UserRequest;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

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

        userRepository.save(user);
    }
}
