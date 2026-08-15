@echo off
REM umumuneo 전체 서버 끄기 - 컨테이너는 삭제하지 않고 정지만 함 (다음에 켤 때 더 빠름)
cd /d "%~dp0"

echo 도커 컨테이너 정지 중...
docker compose stop

echo.
echo 다 껐어요.
pause
