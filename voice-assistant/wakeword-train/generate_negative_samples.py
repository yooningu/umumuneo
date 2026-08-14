"""
"우무"와 헷갈릴 수 있는 발음이 비슷한 단어들 + 일반적인 한국어 단어/짧은 문장을 부정 샘플로 생성한다.
1) MeloTTS 합성음으로 다양한 문구를 생성 (문구 다양성 확보용, 적당히만)
2) 사용자가 직접 녹음한 실제 부정 목소리(voice-assistant/training_data/negative_real/*.wav)를 복제해서 포함
   (실제 목소리로 된 긍정/부정 샘플을 같이 써야, 모델이 "합성음이냐 실제 목소리냐"가 아니라
    진짜 "단어 내용"으로 구분하는 법을 배움)
"""
import io
import os
import random

import numpy as np
import requests
import scipy.io.wavfile as wavfile
import scipy.signal

MELOTTS_URL = "http://melotts:9002/synthesize"
OUTPUT_ROOT = "/workspace/my_custom_model/umu"
REAL_SAMPLES_DIR = "/workspace/training_data/negative_real"
TARGET_SR = 16000
REPEATS_PER_PHRASE = 8      # 합성 문구당 몇 번 만들지
REAL_DUPLICATES = 5         # 실제 부정 녹음 1개당 몇 번 복제할지 (100개 * 5 = 500개)
TEST_SPLIT = 0.1

# "우무"와 발음이 비슷한 단어들(하드 네거티브) + 일상적인 짧은 문구(일반 네거티브)
NEGATIVE_PHRASES = [
    "아무", "우유", "구두", "누구", "무우", "이모", "우수", "어무",
    "안녕하세요", "여보세요", "잠깐만요", "감사합니다", "그럼요",
    "오늘 날씨가 좋네요", "지금 몇 시야", "밥 먹었어", "알겠습니다",
    "잘 자요", "고마워요", "네 알겠어요", "잠시만 기다려주세요",
]


def synth_one(text: str, speed: float) -> tuple[int, np.ndarray]:
    resp = requests.post(MELOTTS_URL, json={"text": text, "speed": speed, "lang": "KR"}, timeout=30)
    resp.raise_for_status()
    sr, data = wavfile.read(io.BytesIO(resp.content))
    return sr, data


def resample_to_target(sr: int, data: np.ndarray) -> np.ndarray:
    if sr == TARGET_SR:
        return data.astype(np.int16)
    n_out = int(round(len(data) * TARGET_SR / sr))
    resampled = scipy.signal.resample(data.astype(np.float32), n_out)
    return np.clip(resampled, -32768, 32767).astype(np.int16)


def main():
    train_dir = os.path.join(OUTPUT_ROOT, "negative_train")
    test_dir = os.path.join(OUTPUT_ROOT, "negative_test")
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(test_dir, exist_ok=True)

    # 1) MeloTTS 합성 부정 샘플
    total = len(NEGATIVE_PHRASES) * REPEATS_PER_PHRASE
    print(f"MeloTTS 부정 샘플 {total}개 합성 중...")
    count = 0
    for phrase in NEGATIVE_PHRASES:
        for r in range(REPEATS_PER_PHRASE):
            speed = random.uniform(0.85, 1.25)
            sr, data = synth_one(phrase, speed)
            data16k = resample_to_target(sr, data)

            is_test = random.random() < TEST_SPLIT
            out_dir = test_dir if is_test else train_dir
            path = os.path.join(out_dir, f"neg_{count:05d}.wav")
            wavfile.write(path, TARGET_SR, data16k)
            count += 1
        print(f"  '{phrase}' 완료 ({count}/{total})")

    # 2) 사용자가 직접 녹음한 실제 부정 목소리 - 원본 단위로 먼저 train/test를 나눈 뒤, 그 안에서 복제
    real_files = []
    if os.path.isdir(REAL_SAMPLES_DIR):
        real_files = [f for f in os.listdir(REAL_SAMPLES_DIR) if f.endswith(".wav")]

    print(f"실제 부정 녹음 파일 {len(real_files)}개를 각 {REAL_DUPLICATES}번씩 복제해서 포함")
    real_count = 0
    for fname in real_files:
        sr, data = wavfile.read(os.path.join(REAL_SAMPLES_DIR, fname))
        if data.ndim > 1:
            data = data.mean(axis=1)
        data16k = resample_to_target(sr, data)

        is_test = random.random() < TEST_SPLIT
        out_dir = test_dir if is_test else train_dir
        base = os.path.splitext(fname)[0]
        for d in range(REAL_DUPLICATES):
            path = os.path.join(out_dir, f"realneg_{base}_{d:02d}.wav")
            wavfile.write(path, TARGET_SR, data16k)
            real_count += 1

    print("완료.")
    print(f"  합성 부정 샘플: {count}개, 실제 녹음 기반 부정 샘플: {real_count}개")
    print(f"  negative_train: {len(os.listdir(train_dir))}개")
    print(f"  negative_test: {len(os.listdir(test_dir))}개")


if __name__ == "__main__":
    main()
