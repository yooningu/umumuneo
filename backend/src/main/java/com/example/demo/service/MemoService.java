package com.example.demo.service;

import com.example.demo.dto.response.MemoResponse;
import com.example.demo.entity.Memo;
import com.example.demo.entity.User;
import com.example.demo.repository.MemoRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MemoService {

    private final MemoRepository memoRepository;
    private final UserRepository userRepository;

    // 탭처럼 여러 개를 만든 순서대로 돌려줌 - 한 번도 안 썼으면(메모가 하나도 없으면) 빈 메모 하나를
    // 만들어서 돌려줘서, 화면에 탭이 0개인 상태가 생기지 않게 함
    @Transactional
    public List<MemoResponse> getMemos(String userId) {
        List<Memo> memos = memoRepository.findByUserIdOrderByCreatedAtAsc(userId);
        if (memos.isEmpty()) {
            memos = List.of(createMemoEntity(userId));
        }
        return memos.stream().map(MemoResponse::new).toList();
    }

    @Transactional
    public MemoResponse createMemo(String userId) {
        return new MemoResponse(createMemoEntity(userId));
    }

    private Memo createMemoEntity(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
        Memo memo = new Memo();
        memo.setUser(user);
        memo.setContent("");
        return memoRepository.save(memo);
    }

    // 타이핑마다(디바운스된) 호출되는 자동 저장 - 본인 메모가 맞는지 확인 후 내용만 덮어씀
    @Transactional
    public void updateMemo(String userId, String memoId, String content) {
        Memo memo = memoRepository.findByIdAndUserId(memoId, userId)
                .orElseThrow(() -> new RuntimeException("메모를 찾을 수 없습니다."));
        memo.setContent(content == null ? "" : content);
        memoRepository.save(memo);
    }

    @Transactional
    public void deleteMemo(String userId, String memoId) {
        Memo memo = memoRepository.findByIdAndUserId(memoId, userId)
                .orElseThrow(() -> new RuntimeException("메모를 찾을 수 없습니다."));
        memoRepository.delete(memo);
    }
}
