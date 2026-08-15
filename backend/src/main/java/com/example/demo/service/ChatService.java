package com.example.demo.service;

import com.example.demo.dto.request.ChatRequest;
import com.example.demo.dto.request.ScheduleRequest;
import com.example.demo.dto.response.ChatResponse;
import com.example.demo.entity.ChatMessage;
import com.example.demo.entity.ChatMessage.MessageRole;
import com.example.demo.entity.ChatSession;
import com.example.demo.entity.Schedule;
import com.example.demo.entity.User;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.ChatSessionRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ScheduleService scheduleService;
    private final ChatSaveService chatSaveService;
    private final KakaoNotificationService kakaoNotificationService;
    private final SttService sttService;
    private final FileService fileService;
    private final WeatherService weatherService;
    private final BusService busService;
    private final ObjectMapper objectMapper;

    @Value("${ollama.base-url}")
    private String ollamaBaseUrl;

    // 이미지가 첨부되면 vision을 지원하는 모델로 전환해서 호출한다
    private static final String VISION_MODEL = "gemma4:12b";

    // 시크릿(임시) 대화 - DB에 아예 저장하지 않고 메모리에 딱 1개 대화 슬롯만 유지한다.
    // 새 시크릿 대화가 시작되면(sessionId 없이 secret=true로 요청) 기존 슬롯은 버려지고(덮어쓰기) 새로 시작함.
    // 서버가 재시작되면 당연히 사라짐 - 그게 목적.
    private static final String SECRET_SESSION_ID = "secret";
    private final List<ChatMessage> secretHistory = Collections.synchronizedList(new ArrayList<>());

    // 세션 목록 조회
    @Transactional(readOnly = true)
    public List<ChatResponse.SessionInfo> getSessions(String userId) {
        return chatSessionRepository.findByUserIdOrderByLastActiveAtDesc(userId)
                .stream()
                .map(ChatResponse.SessionInfo::new)
                .toList();
    }

    // 메시지 목록 조회
    @Transactional(readOnly = true)
    public List<ChatResponse.MessageInfo> getMessages(String userId, String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 세션에 대한 권한이 없습니다.");
        }
        return chatMessageRepository.findBySessionIdOrderByTurnIndexAsc(sessionId)
                .stream()
                .map(ChatResponse.MessageInfo::new)
                .toList();
    }

    // 세션 삭제
    @Transactional
    public void deleteSession(String userId, String sessionId) {
        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("해당 세션에 대한 권한이 없습니다.");
        }
        chatSessionRepository.delete(session);
    }

    // 메시지 전송 (SSE 스트리밍)
    @Transactional
    public SseEmitter sendMessage(String userId, ChatRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        boolean isSecret = request.isSecret();
        boolean isUmu = request.isUmu();

        // 세션 조회 또는 새로 생성
        ChatSession session;
        List<ChatMessage> history;
        int turnIndex;

        if (isUmu) {
            // 우무 음성 비서 전용 - 세션/메시지를 아예 안 만들고 DB에 손도 안 댐.
            // 우무는 원래부터 매번 독립적인 1회성 대화라 이전 기록을 들고 있을 필요도 없음.
            session = new ChatSession();
            session.setUser(user);
            session.setModelName(request.getModel());
            history = List.of();
            turnIndex = 0;
        } else if (isSecret) {
            // 시크릿 모드는 DB를 아예 안 건드림. sessionId 없이 오면 "새 시크릿 대화 시작"이라는
            // 뜻이므로 기존 슬롯은 버리고(덮어쓰기) 새로 시작한다. (프론트에서 시크릿 토글을 켤 때마다
            // 매번 sessionId를 null로 보내서 항상 새로 시작하게 되어 있음)
            if (request.getSessionId() == null) {
                secretHistory.clear();
            }
            session = new ChatSession();
            session.setId(SECRET_SESSION_ID);
            session.setUser(user);
            session.setModelName(request.getModel());

            history = new ArrayList<>(secretHistory);
            turnIndex = secretHistory.size();

            ChatMessage userMessage = new ChatMessage();
            userMessage.setSession(session);
            userMessage.setRole(MessageRole.USER);
            userMessage.setContent(request.getContent());
            userMessage.setIsSummarized(false);
            userMessage.setTurnIndex(turnIndex);
            secretHistory.add(userMessage);
        } else {
            if (request.getSessionId() != null) {
                session = chatSessionRepository.findById(request.getSessionId())
                        .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다."));
                if (!session.getUser().getId().equals(userId)) {
                    throw new RuntimeException("해당 세션에 대한 권한이 없습니다.");
                }
            } else {
                session = new ChatSession();
                session.setUser(user);
                session.setModelName(request.getModel());
                chatSessionRepository.save(session);
            }

            // 이전 대화 내역 조회 (현재 메시지 저장 전 시점 기준)
            history = chatMessageRepository.findBySessionIdOrderByTurnIndexAsc(session.getId());

            // 유저 메시지 저장
            turnIndex = chatMessageRepository.countBySessionId(session.getId());
            ChatMessage userMessage = new ChatMessage();
            userMessage.setSession(session);
            userMessage.setRole(MessageRole.USER);
            userMessage.setContent(request.getContent());
            userMessage.setIsSummarized(false);
            userMessage.setTurnIndex(turnIndex);
            chatMessageRepository.save(userMessage);

            // 세션 마지막 활동 시간 업데이트
            session.setLastActiveAt(LocalDateTime.now());
            chatSessionRepository.save(session);
        }

        // SSE 이미터 생성
        SseEmitter emitter = new SseEmitter(120000L); // 2분 타임아웃
        final ChatSession finalSession = session;
        final int finalTurnIndex = turnIndex;
        final List<ChatMessage> finalHistory = history;
        final List<String> images = request.getImages() != null ? request.getImages() : List.of();
        final List<String> audio = request.getAudio() != null ? request.getAudio() : List.of();
        final List<ChatRequest.FileRef> sendableFiles =
                request.getSendableFiles() != null ? request.getSendableFiles() : List.of();
        final boolean hasAttachment = request.isHasAttachment() || !images.isEmpty();
        final boolean finalIsSecret = isSecret;
        final boolean finalIsUmu = isUmu;

        // 비동기로 Ollama 호출
        new Thread(() -> {
            StringBuilder fullResponse = new StringBuilder();
            try {
                // 음성 파일이 있으면 서버에서 STT로 변환해서 타이핑한 내용 뒤에 붙인다
                // (프론트/DB에 저장되는 메시지는 사용자가 실제로 타이핑한 내용만 유지하고,
                //  변환된 텍스트는 이 턴의 의도 파악/프롬프트 생성에만 사용한다)
                String effectiveMessage = request.getContent();
                for (String b64 : audio) {
                    try {
                        Map<String, Object> result = sttService.transcribeBase64(b64, null);
                        Object text = result.get("text");
                        if (text != null && !text.toString().isBlank()) {
                            effectiveMessage = effectiveMessage.isBlank()
                                    ? text.toString()
                                    : effectiveMessage + "\n\n" + text;
                        }
                    } catch (Exception e) {
                        log.error("음성 파일 STT 변환 실패: {}", e.getMessage());
                    }
                }
                final String messageForPrompt = effectiveMessage;

                // 첨부(이미지 포함) 여부와 무관하게 항상 의도를 분류한다.
                // (이미지가 있어도 "이 사진 나에게 보내줘"처럼 SEND 의도일 수 있으므로 무조건 CHAT으로 넘기면 안 됨)
                String intent = detectIntent(messageForPrompt, finalSession.getModelName());
                // 파일이 첨부되면(이미지든 아니든) 더 성능 좋은 모델을 사용
                String modelToUse = hasAttachment ? VISION_MODEL : finalSession.getModelName();

                String visibleContent;
                if ("BUS".equals(intent)) {
                    // 버스 도착정보는 지금 이 순간의 실시간 값이라 LLM 안 거치고 API 응답을 그대로 정리해서 보여준다
                    String busText;
                    try {
                        busText = busService.getCommuteBusText();
                    } catch (Exception e) {
                        log.error("버스 도착정보 조회 실패: {}", e.getMessage());
                        busText = "지금은 버스 도착정보를 가져올 수 없어요. 잠시 후 다시 시도해주세요.";
                    }
                    visibleContent = busText;
                    emitter.send(SseEmitter.event()
                            .name("chunk")
                            .data("{\"content\":\"" + escapeJson(visibleContent) + "\"}"));
                } else if ("WEATHER".equals(intent)) {
                    // 기상청 API에서 받아온 실제 수치는 그대로 두고(직접 안 지어내게), 그 데이터를 근거로
                    // 질문("내일만", "비 오는지"처럼 구체적인 질문)에 맞춰 자연스럽게 답하도록 LLM에게 맡긴다.
                    String weatherData;
                    try {
                        weatherData = weatherService.getWeeklySummaryText();
                    } catch (Exception e) {
                        log.error("날씨 조회 실패: {}", e.getMessage());
                        weatherData = null;
                    }
                    if (weatherData == null) {
                        visibleContent = "지금은 날씨 정보를 가져올 수 없어요. 잠시 후 다시 시도해주세요.";
                        emitter.send(SseEmitter.event()
                                .name("chunk")
                                .data("{\"content\":\"" + escapeJson(visibleContent) + "\"}"));
                    } else {
                        String weatherPrompt = buildWeatherPrompt(messageForPrompt, weatherData);
                        callOllamaStreaming(modelToUse, weatherPrompt, images, emitter, fullResponse);
                        visibleContent = fullResponse.toString();
                    }
                } else {
                    // 2단계: 의도에 따라 프롬프트 선택
                    String prompt = switch (intent) {
                        case "SCHEDULE" -> buildSchedulePrompt(messageForPrompt, finalHistory, finalSession.getSummary());
                        case "SEND" -> buildSendPrompt(messageForPrompt, finalHistory, finalSession.getSummary(), sendableFiles);
                        default -> buildChatPrompt(messageForPrompt, finalHistory, finalSession.getSummary());
                    };

                    // SCHEDULE/SEND 의도의 응답은 [ACTION:...] {...} 형태의 원문 그대로라 사용자에게
                    // 그대로 스트리밍해서 보여주면 못 알아먹으므로, 이 경우는 실시간 스트리밍하지 않고
                    // 다 받은 뒤 액션을 실행해서 나온 자연어 결과 메시지만 보여준다. (일반 대화만 실시간 스트리밍)
                    boolean isChat = "CHAT".equals(intent);
                    callOllamaStreaming(modelToUse, prompt, images, isChat ? emitter : null, fullResponse);

                    // AI 응답 처리 (일정/전송 관련 액션 실행)
                    String actionResult = processAiResponse(userId, intent, fullResponse.toString(), sendableFiles);

                    if (isChat) {
                        visibleContent = fullResponse.toString();
                        if (actionResult != null) {
                            visibleContent += "\n\n" + actionResult;
                            emitter.send(SseEmitter.event()
                                    .name("chunk")
                                    .data("{\"content\":\"" + escapeJson("\n\n" + actionResult) + "\"}"));
                        }
                    } else {
                        visibleContent = actionResult != null
                                ? actionResult
                                : "요청을 정확히 처리하지 못했어요. 다시 한 번 말씀해주시겠어요?";
                        emitter.send(SseEmitter.event()
                                .name("chunk")
                                .data("{\"content\":\"" + escapeJson(visibleContent) + "\"}"));
                    }
                }

                // AI 메시지 저장 (화면에 보여준 내용 그대로 저장 - SCHEDULE/SEND는 원문 JSON 대신 안내 메시지를 저장)
                // 우무는 아무것도 저장 안 함. 시크릿 모드는 DB 대신 메모리 슬롯에만 추가한다
                if (finalIsUmu) {
                    // 아무것도 안 함 - 기록 자체를 안 남김
                } else if (finalIsSecret) {
                    ChatMessage aiMessage = new ChatMessage();
                    aiMessage.setSession(finalSession);
                    aiMessage.setRole(MessageRole.ASSISTANT);
                    aiMessage.setContent(visibleContent);
                    aiMessage.setIsSummarized(false);
                    aiMessage.setTurnIndex(finalTurnIndex + 1);
                    secretHistory.add(aiMessage);
                } else {
                    chatSaveService.saveAiMessage(finalSession.getId(), visibleContent, finalTurnIndex + 1);

                    // 미요약 메시지가 15개 넘으면 10개 압축
                    List<ChatMessage> unsummarized = chatMessageRepository
                            .findBySessionIdOrderByTurnIndexAsc(finalSession.getId())
                            .stream()
                            .filter(m -> !m.getIsSummarized())
                            .toList();

                    log.info("미요약 메시지 수: {}", unsummarized.size());

                    if (unsummarized.size() >= 15) {
                        log.info("요약 시작");
                        summarizeOldMessages(finalSession);
                    }

                    // 첫 메시지면 AI로 제목 자동 생성
                    if (finalTurnIndex == 0 && finalSession.getTitle() == null) {
                        String title = generateTitle(messageForPrompt, finalSession.getModelName());
                        chatSaveService.updateSessionTitle(finalSession.getId(), title);
                    }
                }

                emitter.send(SseEmitter.event()
                        .name("done")
                        .data("{\"sessionId\":\"" + finalSession.getId() + "\"}"));
                emitter.complete();

            } catch (Exception e) {
                log.error("챗봇 오류: {}", e.getMessage());
                try {
                    String message = e.getMessage() != null ? e.getMessage() : "알 수 없는 오류가 발생했어요.";
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\":\"" + escapeJson(message) + "\"}"));
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        }).start();

        return emitter;
    }

    // Ollama SSE 스트리밍 호출 (텍스트 전용)
    private String callOllamaStreaming(String model, String prompt,
                                       SseEmitter emitter, StringBuilder fullResponse) throws Exception {
        return callOllamaStreaming(model, prompt, List.of(), emitter, fullResponse);
    }

    // Ollama SSE 스트리밍 호출 (이미지 첨부 가능 - vision 모델일 때만 의미 있음)
    private String callOllamaStreaming(String model, String prompt, List<String> images,
                                       SseEmitter emitter, StringBuilder fullResponse) throws Exception {
        URL url = new URL(ollamaBaseUrl + "/api/generate");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10000);
        // Ollama가 (지원 안 하는 이미지 포맷 등으로) 응답을 아예 못 만들고 멈춰버리는 경우
        // 프론트가 무한 로딩에 빠지지 않도록 읽기 타임아웃을 둔다
        conn.setReadTimeout(120000);

        Map<String, Object> requestMap = new java.util.LinkedHashMap<>();
        requestMap.put("model", model);
        requestMap.put("prompt", prompt);
        requestMap.put("stream", true);
        requestMap.put("system", "한국어로 간단히 대답하세요.");
        requestMap.put("think", false);  // ← 이렇게 해야 thinking 비활성화
        // 온도를 낮춰서 [ACTION:...] JSON 출력이 깨지는(글자 누락/오타) 걸 줄인다
        requestMap.put("options", Map.of("temperature", 0.2));
        // 기본 채팅 모델(e4b)은 항상 켜둬서 응답 지연이 없게 하고(keep_alive: -1 = 무제한 유지),
        // 비전 모델(12b)은 이미지 첨부할 때만 가끔 쓰니까 기본값(5분 유휴 시 자동 언로드) 그대로 둔다
        requestMap.put("keep_alive", VISION_MODEL.equals(model) ? "5m" : -1);
        if (images != null && !images.isEmpty()) {
            requestMap.put("images", images);
        }

        String requestBody = objectMapper.writeValueAsString(requestMap);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(requestBody.getBytes(StandardCharsets.UTF_8));
        }

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isEmpty()) continue;
                JsonNode node = objectMapper.readTree(line);
                String chunk = node.path("response").asText("");
                boolean done = node.path("done").asBoolean(false);

                if (!chunk.isEmpty()) {
                    fullResponse.append(chunk);
                    if (emitter != null) {
                        emitter.send(SseEmitter.event()
                                .name("chunk")
                                .data("{\"content\":\"" + escapeJson(chunk) + "\"}"));
                    }
                }

                if (done) break;
            }
        }

        return fullResponse.toString();
    }

    // 의도 파악 (일정 관련 / 카카오톡 나에게 보내기 / 일반 대화)
    private String detectIntent(String userMessage, String modelName) throws Exception {
        String intentPrompt = String.format("""
                다음 메시지의 의도를 분류해서 아래 중 하나로만 답하세요.
                SCHEDULE: 일정 추가/수정/삭제/조회 요청
                SEND: 카카오톡 "나에게 보내기"로 뭔가를 보내달라는 요청 (예: 일정 목록 나에게 보내줘, 이거 나에게 보내줘)
                WEATHER: 날씨/기온/강수확률/비 여부 등에 대한 질문 (예: 오늘 날씨 어때, 이번 주 비 와?, 내일 기온 몇도야)
                BUS: 출근버스/버스 도착시간 관련 질문 (예: 출근버스 언제 와, 버스 몇 분 남았어)
                CHAT: 그 외 일반 대화
                메시지: %s
                """, userMessage);
        StringBuilder result = new StringBuilder();
        callOllamaStreaming(modelName, intentPrompt, null, result);
        String r = result.toString().trim();
        if (r.contains("SCHEDULE")) return "SCHEDULE";
        if (r.contains("SEND")) return "SEND";
        if (r.contains("WEATHER")) return "WEATHER";
        if (r.contains("BUS")) return "BUS";
        return "CHAT";
    }

    private static final DateTimeFormatter NOW_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd(E) a h:mm", Locale.KOREAN);

    // 일정 관련 프롬프트 생성
    private String buildSchedulePrompt(String userMessage, List<ChatMessage> history, String summary) {
        LocalDateTime now = LocalDateTime.now();
        String nowText = now.format(NOW_FORMAT);
        LocalDate today = now.toLocalDate();
        // 상대 날짜 계산을 모델이 직접 하면 자주 틀려서(특히 작은 모델), 자주 쓰이는 값은 미리 계산해서 그대로 알려준다.
        String todayStr = today.toString();
        String tomorrowStr = today.plusDays(1).toString();
        String dayAfterTomorrowStr = today.plusDays(2).toString();
        StringBuilder sb = new StringBuilder();

        // 이전 대화 내역 포함
        if (summary != null && !summary.isEmpty()) {
            sb.append("이전 대화 요약:\n").append(summary).append("\n\n");
        }
        for (ChatMessage msg : history.stream().filter(m -> !m.getIsSummarized()).toList()) {
            if (msg.getRole() == MessageRole.USER) {
                sb.append("사용자: ").append(msg.getContent()).append("\n");
            } else if (msg.getRole() == MessageRole.ASSISTANT) {
                sb.append("어시스턴트: ").append(msg.getContent()).append("\n");
            }
        }

        sb.append(String.format("""

                지금은 %s이야. (오늘=%s, 내일=%s, 모레=%s. 상대 날짜는 직접 계산하지 말고 이 값을 그대로 쓸 것)
                사용자가 "%s"라고 했어.

                반드시 아래 형식 중 하나로만 응답해. JSON 외에 다른 텍스트는 절대 쓰지 마.

                [ACTION:SCHEDULE_GET] {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}
                [ACTION:SCHEDULE_ADD] {"type":"MOMENT","title":"제목","startDate":"YYYY-MM-DD","startTime":"HH:mm:ss","notifOffsetMin":null}
                [ACTION:SCHEDULE_ADD] {"type":"TIMED","title":"제목","startDate":"YYYY-MM-DD","startTime":"HH:mm:ss","endTime":"HH:mm:ss","notifOffsetMin":null}
                [ACTION:SCHEDULE_ADD] {"type":"ALLDAY","title":"제목","startDate":"YYYY-MM-DD","notifOffsetMin":null}
                [ACTION:SCHEDULE_ADD] {"type":"PERIOD","title":"제목","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","notifOffsetMin":null}
                [ACTION:SCHEDULE_DELETE] {"id":"일정ID"}
                [ACTION:SCHEDULE_DELETE_BY_DATE] {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}

                규칙:
                - 알림 또는 알람 언급 있으면 notifOffsetMin=5(몇 분 전인지 특정 언급 있으면 그 값), 없으면 null (알림 = 톡캘린더에 일정이 등록되고 그쪽 리마인더로 알려주는 것. "나에게 보내기"와는 다른 기능이니 헷갈리지 말 것)
                - 이번 주=오늘 포함 7일, 이번 달=이번 달 마지막 날까지, 모든/앞으로=1년치
                - "몇 시"처럼 구체적인 시각 언급이 없으면 MOMENT/TIMED를 쓰지 말고 ALLDAY로 만들 것 (startTime을 null로 하지 말 것)
                - "N분 뒤", "N시간 뒤"처럼 상대 시간 표현이면 반드시 위에 명시된 지금 시각을 기준으로 계산해서 정확한 날짜/시:분으로 변환할 것 (예: 지금이 22:15인데 "10분 뒤"면 22:25)
                - 오전/오후 언급 없이 "O시" 또는 "O시 O분"만 말했다면, 지금 시각 기준으로 그 시각이 이미 지났으면(오전으로 해석 시 과거가 되면) 오후(12시간 뒤)로 해석할 것. 예: 지금이 오후 10시인데 "10시 30분"이라고 하면 이미 지난 오전 10시 30분이 아니라 오늘 오후 10시 30분으로 해석
                - 여러 날에 걸친 일정은 반드시 PERIOD 타입으로 startDate~endDate로 한 번에 등록할 것
                - 특정 일정 하나를 콕 집어 삭제하는 거고 ID를 모르면 먼저 [ACTION:SCHEDULE_GET]으로 조회 후 삭제할 것
                - 특정 날짜/기간에 있는 일정을 통째로 삭제해달라는 요청이면 ID 조회 없이 바로 [ACTION:SCHEDULE_DELETE_BY_DATE]를 쓸 것
                - [ACTION:SCHEDULE_DELETE]는 반드시 실제 UUID 형식의 ID로만 할 것 (날짜나 이름으로는 삭제 불가, 그럴 땐 SCHEDULE_DELETE_BY_DATE 사용)
                """, nowText, todayStr, tomorrowStr, dayAfterTomorrowStr, userMessage));

        return sb.toString();
    }

    // "나에게 보내기" 프롬프트 생성 (카카오톡 자기 자신에게 즉시 메시지 발송)
    private String buildSendPrompt(String userMessage, List<ChatMessage> history, String summary,
                                    List<ChatRequest.FileRef> sendableFiles) {
        LocalDate today = LocalDate.now();
        StringBuilder sb = new StringBuilder();

        if (summary != null && !summary.isEmpty()) {
            sb.append("이전 대화 요약:\n").append(summary).append("\n\n");
        }
        for (ChatMessage msg : history.stream().filter(m -> !m.getIsSummarized()).toList()) {
            if (msg.getRole() == MessageRole.USER) {
                sb.append("사용자: ").append(msg.getContent()).append("\n");
            } else if (msg.getRole() == MessageRole.ASSISTANT) {
                sb.append("어시스턴트: ").append(msg.getContent()).append("\n");
            }
        }

        String fileNamesText = sendableFiles.isEmpty()
                ? "없음"
                : sendableFiles.stream().map(ChatRequest.FileRef::getName).reduce((a, b) -> a + ", " + b).orElse("없음");

        sb.append(String.format("""

                오늘은 %s이야. 사용자가 "%s"라고 했어. 카카오톡 "나에게 보내기"로 뭔가를 즉시 보내달라는 요청이야.
                이번 메시지에 첨부되어 그대로 보낼 수 있는 파일 목록: %s

                반드시 아래 형식 중 하나로만 응답해. JSON 외에 다른 텍스트는 절대 쓰지 마.

                [ACTION:SEND_SCHEDULE] {"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}
                [ACTION:SEND_TEXT] {"content":"보낼 내용"}
                [ACTION:SEND_FILE] {"filename":"위 첨부 파일 목록에 있는 이름 그대로"}

                규칙:
                - 일정 목록/일정표를 보내달라는 요청이면 SEND_SCHEDULE 사용 (이번 주=오늘 포함 7일, 이번 달=이번 달 마지막 날까지)
                - 첨부된 파일(사진 포함)을 그대로/내용을 보내달라는 요청이면 SEND_FILE 사용. filename은 반드시 위 목록에 있는 이름 그대로 쓸 것 (내용을 직접 만들어내거나 요약하지 말 것)
                - 그 외 대화 내용 요약이나 직접 작성한 텍스트를 보내는 거라면 SEND_TEXT 사용
                - 위 목록에 없는 파일을 보내달라는 요청이면 지원하지 않는 파일이라고 SEND_TEXT로 안내할 것
                """, today, userMessage, fileNamesText));

        return sb.toString();
    }

    // 날씨 질문 프롬프트 생성 - 기상청 API 데이터를 근거로 질문에 맞게 답하게 함 (수치는 데이터 그대로만 쓰도록 강하게 제한)
    private String buildWeatherPrompt(String userMessage, String weatherData) {
        return String.format("""
                아래는 기상청에서 방금 가져온 실제 날씨 데이터야.

                [날씨 데이터]
                %s

                사용자가 "%s"라고 물어봤어.

                규칙:
                - 반드시 위 데이터에 있는 숫자만 사용해. 데이터에 없는 날짜/수치는 답하지 말고 없다고 해.
                - 사용자가 특정 날(오늘/내일/모레/토요일 등)만 물어봤으면 그 날 것만 짧게 답해. 며칠 다 물어본 게 아니면 표 전체를 나열하지 마.
                - "비 와?"처럼 예/아니오로 답할 수 있는 질문이면 강수확률을 근거로 자연스럽게 예/아니오부터 말해줘 (예: 강수확률 60%%면 "강수확률이 60%%로 비가 올 가능성이 있어요", 20%% 이하면 "강수확률이 20%%로 비가 안올 것 같아요" 식으로).
                - 존댓말로 짧고 자연스럽게 답해. 이모지나 표 형식 없이 문장으로.
                """, weatherData, userMessage);
    }

    // 일반 대화 프롬프트 생성
    private String buildChatPrompt(String userMessage, List<ChatMessage> history, String summary) {
        StringBuilder sb = new StringBuilder();

        // 요약본 있으면 먼저 포함
        if (summary != null && !summary.isEmpty()) {
            sb.append("이전 대화 요약:\n").append(summary).append("\n\n");
        }

        // 최근 10턴만 포함
        List<ChatMessage> recent = history.stream()
                .filter(m -> !m.getIsSummarized())
                .toList();

        for (ChatMessage msg : recent) {
            if (msg.getRole() == MessageRole.USER) {
                sb.append("사용자: ").append(msg.getContent()).append("\n");
            } else if (msg.getRole() == MessageRole.ASSISTANT) {
                sb.append("어시스턴트: ").append(msg.getContent()).append("\n");
            }
        }
        sb.append("사용자: ").append(userMessage);
        return sb.toString();
    }

    // AI 응답에서 액션 처리
    private String processAiResponse(String userId, String intent, String response,
                                      List<ChatRequest.FileRef> sendableFiles) {
        try {
            if (response.contains("[ACTION:SCHEDULE_ADD]")) {
                int start = response.indexOf("[ACTION:SCHEDULE_ADD]") + "[ACTION:SCHEDULE_ADD]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                ScheduleRequest scheduleRequest = objectMapper.readValue(json, ScheduleRequest.class);
                Schedule created = scheduleService.createSchedule(userId, scheduleRequest);
                log.info("챗봇이 일정 추가: {}", json);
                return describeCreatedSchedule(created, scheduleRequest.getNotifOffsetMin());

            } else if (response.contains("[ACTION:SCHEDULE_DELETE]")) {
                int start = response.indexOf("[ACTION:SCHEDULE_DELETE]") + "[ACTION:SCHEDULE_DELETE]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                JsonNode node = objectMapper.readTree(json);
                String scheduleId = node.path("id").asText();
                String deletedTitle = scheduleService.getSchedule(userId, scheduleId).getTitle();
                scheduleService.deleteSchedule(userId, scheduleId);
                log.info("챗봇이 일정 삭제: {}", scheduleId);
                return "'" + deletedTitle + "' 일정을 삭제했어요.";

            } else if (response.contains("[ACTION:SCHEDULE_DELETE_BY_DATE]")) {
                int start = response.indexOf("[ACTION:SCHEDULE_DELETE_BY_DATE]") + "[ACTION:SCHEDULE_DELETE_BY_DATE]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                JsonNode node = objectMapper.readTree(json);
                String from = node.path("from").asText();
                String to = node.path("to").asText();
                scheduleService.deleteSchedulesByDate(userId, LocalDate.parse(from), LocalDate.parse(to));
                log.info("챗봇이 날짜 기반 일정 삭제: {} ~ {}", from, to);
                String rangeLabel = from.equals(to)
                        ? koreanDateLabel(LocalDate.parse(from))
                        : koreanDateLabel(LocalDate.parse(from)) + "부터 " + koreanDateLabel(LocalDate.parse(to)) + "까지";
                return rangeLabel + " 일정을 모두 삭제했어요.";

            } else if (response.contains("[ACTION:SCHEDULE_GET]")) {
                int start = response.indexOf("[ACTION:SCHEDULE_GET]") + "[ACTION:SCHEDULE_GET]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                JsonNode node = objectMapper.readTree(json);
                String from = node.path("from").asText();
                String to = node.path("to").asText();

                List<com.example.demo.dto.response.ScheduleResponse> schedules =
                        scheduleService.getSchedules(userId,
                                java.time.LocalDate.parse(from),
                                java.time.LocalDate.parse(to),
                                null);

                if (schedules.isEmpty()) {
                    return "해당 기간에 일정이 없습니다.";
                }

                StringBuilder sb = new StringBuilder("일정 목록:\n");
                for (var s : schedules) {
                    sb.append("- [ID:").append(s.getId()).append("] ");
                    sb.append(s.getTitle());
                    if (s.getStartTime() != null) {
                        sb.append(" (").append(s.getStartTime()).append(")");
                    }
                    sb.append("\n");
                }
                return sb.toString();

            } else if (response.contains("[ACTION:SEND_SCHEDULE]")) {
                int start = response.indexOf("[ACTION:SEND_SCHEDULE]") + "[ACTION:SEND_SCHEDULE]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                JsonNode node = objectMapper.readTree(json);
                String from = node.path("from").asText();
                String to = node.path("to").asText();

                List<com.example.demo.dto.response.ScheduleResponse> schedules =
                        scheduleService.getSchedules(userId, LocalDate.parse(from), LocalDate.parse(to), null);

                StringBuilder text = new StringBuilder("📅 일정 목록 (" + from + " ~ " + to + ")\n\n");
                if (schedules.isEmpty()) {
                    text.append("해당 기간에 일정이 없습니다.");
                } else {
                    for (var s : schedules) {
                        text.append("- ").append(s.getTitle());
                        if (s.getStartTime() != null) text.append(" (").append(s.getStartTime()).append(")");
                        text.append("\n");
                    }
                }

                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
                kakaoNotificationService.sendText(user, text.toString());
                log.info("챗봇이 일정 목록을 나에게 보내기로 발송: {} ~ {}", from, to);
                return "카카오톡으로 일정 목록을 보내드렸어요.";

            } else if (response.contains("[ACTION:SEND_TEXT]")) {
                int start = response.indexOf("[ACTION:SEND_TEXT]") + "[ACTION:SEND_TEXT]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                JsonNode node = objectMapper.readTree(json);
                String content = node.path("content").asText();

                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));
                kakaoNotificationService.sendText(user, content);
                log.info("챗봇이 나에게 보내기로 텍스트 발송");
                return "카카오톡으로 보내드렸어요.";

            } else if (response.contains("[ACTION:SEND_FILE]")) {
                int start = response.indexOf("[ACTION:SEND_FILE]") + "[ACTION:SEND_FILE]".length();
                int end = response.indexOf("\n", start);
                String json = end > 0 ? response.substring(start, end).trim() : response.substring(start).trim();
                JsonNode node = objectMapper.readTree(json);
                String filename = node.path("filename").asText();

                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

                // 짧게 유효한 공개 링크를 만들어서 발송
                // (배포 전 localhost 환경에서는 카카오 서버가 이 링크에 접근을 못 해서 실제로는 실패함)
                ChatRequest.FileRef fileRef = sendableFiles.stream()
                        .filter(f -> f.getName().equals(filename))
                        .findFirst()
                        .orElse(null);
                if (fileRef != null) {
                    String publicUrl = fileService.generatePublicUrl(userId, fileRef.getFileId());
                    if (fileRef.isImage()) {
                        kakaoNotificationService.sendImage(user, publicUrl, fileRef.getName());
                    } else {
                        kakaoNotificationService.sendText(user, "📎 " + fileRef.getName() + "\n" + publicUrl);
                    }
                    log.info("챗봇이 나에게 보내기로 파일 공개 링크 발송: {}", filename);
                    return "카카오톡으로 \"" + filename + "\"을(를) 보내드렸어요. (배포 전이라 실제 수신은 안 될 수 있어요)";
                }

                log.warn("SEND_FILE: 첨부 파일을 찾지 못함 (filename={})", filename);
                return "보내려는 파일을 찾지 못했어요. 다시 첨부해서 요청해주시겠어요?";
            }

        } catch (Exception e) {
            log.warn("액션 처리 실패 (intent={}): {}", intent, e.getMessage());
            return "요청을 처리하는 중 오류가 발생했어요. 다시 한 번 말씀해주시겠어요?";
        }

        // SCHEDULE/SEND 의도인데 위 액션 형식 중 어느 것도 인식하지 못한 경우
        // (모델이 [ACTION:...] 태그나 JSON을 깨뜨려서 낸 경우 등) -> 조용히 무시하지 말고 알려준다
        if ("SCHEDULE".equals(intent) || "SEND".equals(intent)) {
            log.warn("액션 형식을 인식하지 못함 (intent={}): {}", intent, response);
            return "요청을 정확히 처리하지 못했어요. 다시 한 번 말씀해주시겠어요?";
        }
        return null;
    }

    // 날짜를 자연스러운 한국어로 ("오늘"/"내일"/"모레" 우선, 아니면 "N월 N일")
    private String koreanDateLabel(LocalDate date) {
        LocalDate today = LocalDate.now();
        if (date.equals(today)) return "오늘";
        if (date.equals(today.plusDays(1))) return "내일";
        if (date.equals(today.plusDays(2))) return "모레";
        return date.getMonthValue() + "월 " + date.getDayOfMonth() + "일";
    }

    // 시각을 자연스러운 한국어로 ("오후 4시", "오전 9시 30분")
    private String koreanTimeLabel(LocalTime time) {
        boolean pm = time.getHour() >= 12;
        int hour12 = time.getHour() % 12;
        if (hour12 == 0) hour12 = 12;
        String label = (pm ? "오후 " : "오전 ") + hour12 + "시";
        if (time.getMinute() != 0) label += " " + time.getMinute() + "분";
        return label;
    }

    // 방금 추가한 일정을 챗봇이 사용자에게 보여줄 자연어 확인 메시지로 변환
    // (원문 [ACTION:...] JSON을 그대로 보여주면 못 알아먹으므로 이걸로 대체함)
    private String describeCreatedSchedule(Schedule schedule, Integer notifOffsetMin) {
        String title = schedule.getTitle();
        String body = switch (schedule.getType()) {
            case MOMENT -> koreanDateLabel(schedule.getStartDate()) + " " + koreanTimeLabel(schedule.getStartTime())
                    + "에 '" + title + "' 일정을 추가했어요.";
            case TIMED -> {
                String time = koreanTimeLabel(schedule.getStartTime());
                if (schedule.getEndTime() != null) {
                    time += "~" + koreanTimeLabel(schedule.getEndTime());
                }
                yield koreanDateLabel(schedule.getStartDate()) + " " + time + "에 '" + title + "' 일정을 추가했어요.";
            }
            case ALLDAY -> koreanDateLabel(schedule.getStartDate()) + "에 '" + title + "' 종일 일정을 추가했어요.";
            case PERIOD -> koreanDateLabel(schedule.getStartDate()) + "부터 " + koreanDateLabel(schedule.getEndDate())
                    + "까지 '" + title + "' 일정을 추가했어요.";
        };
        if (notifOffsetMin != null) {
            body += " (" + notifOffsetMin + "분 전 카카오톡 알림도 넣어드렸어요)";
        }
        return body;
    }

    // 세션 제목 자동 생성 (첫 메시지 기반, AI 호출)
    private String generateTitle(String firstMessage, String modelName) throws Exception {
        String titlePrompt = String.format(
                "다음 대화의 제목을 10자 이내로 만들어줘. 다른 말 없이 제목만 답해:\n%s",
                firstMessage
        );
        StringBuilder result = new StringBuilder();
        callOllamaStreaming(modelName, titlePrompt, null, result);
        String title = result.toString().trim();
        return title.length() > 30 ? title.substring(0, 30) : title;
    }

    // 오래된 대화 요약 (10턴 초과 시 최근 10개만 남기고 나머지 요약)
    private void summarizeOldMessages(ChatSession session) throws Exception {
        List<ChatMessage> messages = chatMessageRepository
                .findBySessionIdOrderByTurnIndexAsc(session.getId());

        // is_summarized=false인 메시지만
        List<ChatMessage> unsummarized = messages.stream()
                .filter(m -> !m.getIsSummarized())
                .toList();

        if (unsummarized.size() <= 10) return;

        // 앞에서 10개만 압축
        List<ChatMessage> toSummarize = unsummarized.subList(0, 10);

        // 요약 프롬프트
        StringBuilder sb = new StringBuilder("다음 대화를 핵심만 간략히 요약해:\n");
        for (ChatMessage msg : toSummarize) {
            sb.append(msg.getRole() == MessageRole.USER ? "사용자: " : "AI: ");
            sb.append(msg.getContent()).append("\n");
        }

        StringBuilder summary = new StringBuilder();
        callOllamaStreaming(session.getModelName(), sb.toString(), null, summary);

        List<String> ids = toSummarize.stream().map(m -> m.getId()).toList();
        chatSaveService.markAsSummarized(ids, session.getId(), summary.toString().trim());
    }

    // JSON 이스케이프
    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
