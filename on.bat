@echo off
REM umumuneo 전체 서버 켜기 - 도커 컨테이너 + 그 안의 백엔드/프론트/Whisper/MeloTTS 프로세스까지 전부
cd /d "%~dp0"

echo [1/6] 도커 컨테이너 켜는 중...
docker compose up -d

echo [2/6] 컨테이너 준비될 때까지 잠깐 대기...
timeout /t 15 /nobreak >nul

echo [3/6] 백엔드 실행 중...
docker exec -d spring-dev sh -c "cd /workspace && ./gradlew bootRun > /tmp/backend.log 2>&1"

echo [4/6] 프론트엔드 실행 중...
docker exec -d react-dev sh -c "cd /workspace && npm install && npm run dev -- --host > /tmp/frontend.log 2>&1"

echo [5/6] Whisper(STT) 실행 중...
docker exec -d whisper-dev sh -c "cd /workspace && pip install -q -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 9000 > /tmp/whisper.log 2>&1"

echo [6/6] MeloTTS(TTS) 실행 중...
docker exec -d melotts-dev sh -c "cd /workspace && pip install -q -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 9002 > /tmp/melotts.log 2>&1"

echo.
echo 다 켰어요. 처음 켜는 거면 pip/npm 설치 때문에 실제로 다 뜨는 데 몇 분 더 걸릴 수 있어요.
pause
