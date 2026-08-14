"""
웨이크워드("우무") 학습용 "부정 샘플"(다른 단어들) 실제 목소리 녹음 스크립트.
"우무"와 발음이 비슷한 단어들 + 일상적인 문구를 실제 목소리로 녹음해서,
모델이 "합성음이냐 아니냐"가 아니라 진짜 "단어 내용"으로 구분하도록 돕는다.
마이크가 필요해서 도커 밖(윈도우)에서 직접 실행해야 함.

설치:
    pip install sounddevice numpy scipy

실행:
    python record_negative_samples.py
"""
import os
import time

import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write as wav_write

SAMPLE_RATE = 16000
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "training_data", "negative_real")
TARGET_COUNT = 100

# "우무"와 발음이 비슷한 단어들(하드 네거티브) + 일상적인 짧은 문구(일반 네거티브)
# 순서대로 돌아가면서 출제됨 (엔터 칠 때마다 다음 문구가 바뀜)
PHRASES = [
    "아무", "우유", "구두", "누구", "무우", "이모", "우수", "어무",
    "오무", "우모", "아모", "무야",
    "안녕하세요", "여보세요", "잠깐만요", "감사합니다", "그럼요",
    "오늘 날씨가 좋네요", "지금 몇 시야", "밥 먹었어", "알겠습니다",
    "잘 자요", "고마워요", "네 알겠어요", "잠시만 기다려주세요",
    "오늘 뭐 먹을까", "내일 일정 알려줘", "음악 틀어줘", "볼륨 좀 줄여줘",
    "불 좀 꺼줘", "커피 한잔 하고 싶다", "요즘 날씨가 덥네", "주말에 뭐 하지",
]


def duration_for(phrase: str) -> float:
    # 문구 길이에 따라 녹음 시간을 다르게 (짧은 단어는 짧게, 문장은 길게)
    return max(1.2, min(3.5, 0.4 * len(phrase) + 0.6))


def record_one(duration: float) -> np.ndarray:
    audio = sd.rec(int(duration * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype="int16")
    sd.wait()
    return audio


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    existing = len([f for f in os.listdir(OUTPUT_DIR) if f.endswith(".wav")])
    print(f"기존에 녹음된 파일: {existing}개")
    print(f"목표: 총 {TARGET_COUNT}개")
    print("매번 화면에 나오는 문구를 그대로 말씀해주세요. ('우무'가 아닌 다른 말들이에요)")
    print("(그만하려면 Ctrl+C)\n")

    count = existing
    try:
        while count < TARGET_COUNT:
            phrase = PHRASES[count % len(PHRASES)]
            dur = duration_for(phrase)
            input(f"[{count + 1}/{TARGET_COUNT}] 다음 문구: \"{phrase}\"  (준비되면 엔터, {dur:.1f}초 녹음)...")
            print("  녹음 중...", end="", flush=True)
            audio = record_one(dur)
            print(" 완료")

            safe_phrase = phrase.replace(" ", "_")
            path = os.path.join(OUTPUT_DIR, f"neg_{count + 1:03d}_{safe_phrase}.wav")
            wav_write(path, SAMPLE_RATE, audio)
            count += 1
            time.sleep(0.3)
    except KeyboardInterrupt:
        print("\n중단됨.")

    print(f"\n총 {count}개 녹음 완료. 저장 위치: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
