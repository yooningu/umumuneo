"""
"우무" 긍정 샘플 생성 스크립트.
1) MeloTTS(이미 떠 있는 melotts 컨테이너)로 다양한 속도의 합성음을 생성
2) 사용자가 직접 녹음한 실제 목소리(voice-assistant/training_data/positive_real/*.wav)를 여러 번 복제해서 포함
   (실제 목소리 30개 vs 합성음 1500개처럼 비율 차이가 너무 크면, 모델이 "우무"라는 단어가 아니라
    "MeloTTS 특유의 목소리"만 외워버려서 실제 사람 목소리를 거의 인식 못 하는 문제가 생김.
    그래서 합성음 개수는 줄이고, 실제 녹음은 복제해서 비중을 크게 높인다.
    같은 원본을 복제해도 augment_clips 단계에서 매번 다른 배경소음/잔향이 랜덤하게 입혀지므로
    완전히 똑같은 데이터가 되지는 않는다.)
모두 16kHz mono 16bit로 맞춰서 positive_train / positive_test 디렉토리에 나눠 저장한다.
"""
import io
import os
import random

import numpy as np
import requests
import scipy.io.wavfile as wavfile
import scipy.signal

MELOTTS_URL = "http://melotts:9002/synthesize"
TARGET_WORD = "우무"
N_SYNTHETIC = 150           # MeloTTS로 만들 합성 샘플 수 (실제 녹음이 130개로 늘어서 더 줄임)
REAL_DUPLICATES = 4         # 실제 녹음 1개당 몇 번 복제할지 (130개 * 4 = 520개)
TEST_SPLIT = 0.1            # 검증용으로 뗄 비율
OUTPUT_ROOT = "/workspace/my_custom_model/umu"
REAL_SAMPLES_DIR = "/workspace/training_data/positive_real"
TARGET_SR = 16000


def synth_one(speed: float) -> tuple[int, np.ndarray]:
    resp = requests.post(MELOTTS_URL, json={"text": TARGET_WORD, "speed": speed, "lang": "KR"}, timeout=30)
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
    train_dir = os.path.join(OUTPUT_ROOT, "positive_train")
    test_dir = os.path.join(OUTPUT_ROOT, "positive_test")
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(test_dir, exist_ok=True)

    # 1) MeloTTS 합성 샘플
    print(f"MeloTTS로 '{TARGET_WORD}' {N_SYNTHETIC}개 합성 중...")
    for i in range(N_SYNTHETIC):
        speed = random.uniform(0.8, 1.3)  # 화자가 1명뿐이라 속도라도 다양하게
        sr, data = synth_one(speed)
        data16k = resample_to_target(sr, data)

        is_test = random.random() < TEST_SPLIT
        out_dir = test_dir if is_test else train_dir
        path = os.path.join(out_dir, f"melo_{i:05d}.wav")
        wavfile.write(path, TARGET_SR, data16k)

        if (i + 1) % 100 == 0:
            print(f"  {i + 1}/{N_SYNTHETIC}")

    # 2) 사용자가 직접 녹음한 실제 목소리 - 원본 단위로 먼저 train/test를 나눈 뒤, 그 안에서 복제
    #    (복제본이 train/test에 걸쳐 섞이면 검증 점수가 부풀려지므로 원본 단위로 분리해야 함)
    real_files = []
    if os.path.isdir(REAL_SAMPLES_DIR):
        real_files = [f for f in os.listdir(REAL_SAMPLES_DIR) if f.endswith(".wav")]

    print(f"실제 녹음 파일 {len(real_files)}개를 각 {REAL_DUPLICATES}번씩 복제해서 포함")
    count = 0
    for fname in real_files:
        sr, data = wavfile.read(os.path.join(REAL_SAMPLES_DIR, fname))
        if data.ndim > 1:  # 혹시 스테레오면 모노로
            data = data.mean(axis=1)
        data16k = resample_to_target(sr, data)

        is_test = random.random() < TEST_SPLIT
        out_dir = test_dir if is_test else train_dir
        base = os.path.splitext(fname)[0]
        for d in range(REAL_DUPLICATES):
            path = os.path.join(out_dir, f"real_{base}_{d:02d}.wav")
            wavfile.write(path, TARGET_SR, data16k)
            count += 1

    print(f"완료. 실제 녹음 기반 샘플 {count}개 생성")
    print(f"  positive_train: {len(os.listdir(train_dir))}개")
    print(f"  positive_test: {len(os.listdir(test_dir))}개")


if __name__ == "__main__":
    main()
