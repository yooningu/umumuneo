# 우무 음성 비서 실행 스크립트
Set-Location -Path $PSScriptRoot

# ── ffmpeg(ffplay) 확인 후 없으면 자동 설치 ──
if (-not (Get-Command ffplay -ErrorAction SilentlyContinue)) {
    Write-Host "ffmpeg가 없어서 설치를 시도할게요 (winget)..."
    winget install --id Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements

    # winget 설치 직후엔 지금 열려있는 PowerShell 세션에 PATH가 아직 반영 안 돼있어서 수동으로 갱신함
    $machinePath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machinePath;$userPath"

    if (-not (Get-Command ffplay -ErrorAction SilentlyContinue)) {
        Write-Host "ffmpeg 자동 설치에 실패한 것 같아요. 수동으로 설치해주세요: winget install Gyan.FFmpeg"
        Write-Host "설치 후에는 이 창을 닫고 새로 실행해주세요 (PATH 반영을 위해)."
        Read-Host "아무 키나 누르면 창이 닫혀요"
        exit 1
    }
    Write-Host "ffmpeg 설치 완료."
}

# ── 파이썬 패키지 확인 ──
Write-Host "필요한 패키지 확인 중..."
py -3.12 -m pip install -q -r requirements.txt

Write-Host "우무 음성 비서 시작..."
py -3.12 assistant.py

Write-Host ""
Write-Host "프로그램이 종료됐습니다. 아무 키나 누르면 창이 닫혀요."
Read-Host
