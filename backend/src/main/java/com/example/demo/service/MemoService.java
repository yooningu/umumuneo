package com.example.demo.service;

import com.example.demo.dto.response.MemoResponse;
import com.example.demo.entity.Memo;
import com.example.demo.entity.User;
import com.example.demo.repository.MemoRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemoService {

    private final MemoRepository memoRepository;
    private final UserRepository userRepository;

    // 아직 한 번도 안 썼으면(메모 row가 없으면) 빈 내용으로 응답
    @Transactional(readOnly = true)
    public MemoResponse getMemo(String userId) {
        return memoRepository.findByUserId(userId)
                .map(MemoResponse::new)
                .orElseGet(() -> new MemoResponse("", null));
    }

    // 타이핑마다(디바운스된) 호출되는 자동 저장 - 메모가 없으면 새로 만들고, 있으면 내용만 덮어씀
    @Transactional
    public void updateMemo(String userId, String content) {
        Memo memo = memoRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
            Memo created = new Memo();
            created.setUser(user);
            return created;
        });
        memo.setContent(content == null ? "" : content);
        memoRepository.save(memo);
    }
}
