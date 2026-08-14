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
            "#FF0073", "#FF6B81", "#FF7F50", "#FFA502", "#ECCC68",
            "#2ED573", "#1E90FF", "#5352ED", "#A55EEA", "#FF6348",
            "#4071C3", "#22355E", "#F368E0", "#FF9FF3", "#FECA57",
            "#48DBFB", "#FF9F43", "#EE5A24", "#009432", "#0652DD",
            "#9980FA", "#C4E538", "#FDA7DF", "#D980FA", "#1289A7",
            "#B53471", "#6F1E51", "#C20007", "#006266", "#1B1464"
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
