"""
웨이크워드("우무") 학습용 실제 목소리 녹음 스크립트.
마이크가 필요해서 도커 밖(윈도우)에서 직접 실행해야 함.

설치:
    pip install sounddevice numpy scipy

실행:
    python record_samples.py
"""
import os
import sys
import time

import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write as wav_write

SAMPLE_RATE = 16000  # openWakeWord가 16kHz를 기대함
DURATION_SEC = 1.5   # "우무" 한 번 말하기엔 충분한 길이
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "training_data", "positive_real")
TARGET_COUNT = 130  # 30개 녹음하셨던 것에 100개 더 추가


def record_one() -> np.ndarray:
    audio = sd.rec(int(DURATION_SEC * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype="int16")
    sd.wait()
    return audio


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    existing = len([f for f in os.listdir(OUTPUT_DIR) if f.endswith(".wav")])
    print(f"기존에 녹음된 파일: {existing}개")
    print(f"목표: 총 {TARGET_COUNT}개")
    print("엔터를 누르면 1.5초간 녹음을 시작합니다. '우무'라고 말해주세요.")
    print("조용한 환경에서, 말하는 속도/톤을 조금씩 다르게 하면서 녹음하면 더 좋아요.")
    print("(그만하려면 Ctrl+C)\n")

    count = existing
    try:
        while count < TARGET_COUNT:
            input(f"[{count + 1}/{TARGET_COUNT}] 준비되면 엔터...")
            print("  녹음 중...", end="", flush=True)
            audio = record_one()
            print(" 완료")

            path = os.path.join(OUTPUT_DIR, f"umu_{count + 1:03d}.wav")
            wav_write(path, SAMPLE_RATE, audio)
            count += 1
            time.sleep(0.3)
    except KeyboardInterrupt:
        print("\n중단됨.")

    print(f"\n총 {count}개 녹음 완료. 저장 위치: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
