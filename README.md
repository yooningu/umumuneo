# umumuneo

우무(AI)를 통해 일정관리, 날씨·버스 조회를 음성/채팅으로 처리하고, 클라우드(NAS) 기능도 제공하는 개인용 통합 서비스

## 구성

- **backend** — Spring Boot 3.5 (Java 17) + MariaDB. 일정 관리, 로컬 LLM(Ollama) 챗봇, 카카오 로그인/알림, NAS 파일 업로드·미리보기, 기상청·부산버스 API 연동
- **frontend** — React 19 + TypeScript + Vite. 캘린더, 챗봇 위젯(시크릿 모드 포함), NAS
- **voice-assistant** — "우무" 상시 대기 음성 비서 (Windows 네이티브 실행). 커스텀 웨이크워드(openWakeWord) + Whisper STT + MeloTTS + 음악 재생
- **whisper-service** — 로컬 STT (faster-whisper)
- **melotts-service** — 로컬 TTS (MeloTTS)

## 실행

```bash
docker compose up -d
```

`.env`에 `CLOUDFLARE_TUNNEL_TOKEN`, `KMA_AUTH_KEY`, `BUS_BUSAN_SERVICE_KEY` 등 필요한 값 설정 필요 (커밋되지 않음).

음성 비서는 마이크/스피커 접근 때문에 도커 밖에서 `voice-assistant/우무_실행.bat`로 직접 실행.
