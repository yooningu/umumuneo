package com.example.demo.util;

import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ColorUtil {

    private final UserRepository userRepository;

    private static final List<String> COLORS = List.of(
            "#006266", "#009432", "#0652DD", "#1289A7", "#1B1464",
            "#1E90FF", "#22355E", "#2ED573", "#4071C3", "#48DBFB",
            "#5352ED", "#6F1E51", "#9980FA", "#A55EEA", "#B53471",
            "#C20007", "#C4E538", "#D980FA", "#E36A00", "#EE5A24",
            "#F368E0", "#FDA7DF", "#FF0073", "#FF4343", "#FF6B81",
            "#FF9F43", "#FF9FF3"
    );

    // 다음 색상 반환 (순서대로 순환)
    public String nextColor(User user) {
        int index = user.getColorIndex();
        String color = COLORS.get(index % COLORS.size());

        // 인덱스 증가 후 저장
        user.setColorIndex(index + 1);
        userRepository.save(user);

        return color;
    }
}
