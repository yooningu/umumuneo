"""
"우무" 상시 대기 음성 비서.
마이크로 계속 듣다가 "우무"가 감지되면:
  이어지는 말 녹음 -> Whisper(STT) -> 백엔드 챗봇(SSE) -> MeloTTS(TTS) -> 스피커로 응답 재생
순서로 처리한다. 도커 밖(윈도우)에서 직접 실행해야 함 (마이크/스피커 접근 때문).

설치:
    pip install -r requirements.txt

실행:
    python assistant.py
"""
import io
import json
import os
import re
import subprocess
import threading
import time
import wave

import keyboard
import numpy as np
import onnxruntime as ort
import openwakeword
import requests
import sounddevice as sd
import scipy.io.wavfile as wavfile
from openwakeword.model import Model
from playsound import playsound

import config

# ── 설정 ──
WAKEWORD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "wakeword-train", "my_custom_model", "woomoo.onnx")
WAKEWORD_THRESHOLD = 0.5

# 우무 감지되면 sound3(듣기 시작 알림), 말 다 들으면 sound1(그만 말해도 됨 알림)
SOUND_WAKE = os.path.join(os.path.dirname(__file__), "sound3.mp3")
SOUND_DONE_LISTENING = os.path.join(os.path.dirname(__file__), "sound1.mp3")

WHISPER_URL = "http://localhost:9000/transcribe"
MELOTTS_URL = "http://localhost:9002/synthesize"
BACKEND_URL = "http://localhost:8080/api/v1"
CHAT_MODEL = "gemma4:e4b"

SAMPLE_RATE = 16000
FRAME_SIZE = 1280  # 80ms @ 16kHz - openWakeWord가 권장하는 단위

# 명령 녹음 중 "말이 끝났다"고 판단하는 기준.
# 마이크 볼륨(소리 크기)만 보는 방식은 마이크를 증폭시키면 잡음까지 같이 커져서 오작동하므로,
# 소리 크기 대신 "진짜 사람 목소리인지"를 직접 판단하는 VAD(Voice Activity Detection) 모델을 씀
# (openWakeWord에 이미 같이 들어있는 Silero VAD 재사용 - 마이크 게인이 얼마든 영향 안 받음)
VAD_SPEECH_THRESHOLD = 0.5
SILENCE_DURATION_SEC = 0.7
MAX_COMMAND_SEC = 15

# ── 음악 재생 상태 ──
# ffplay한테 통째로 맡기면 재생 중간에 볼륨을 못 바꿔서, ffmpeg로 원본 소리(PCM)만 뽑아와
# 파이썬이 직접 볼륨을 곱해가며 스피커로 흘려보내는 방식으로 함 ("우무" 들릴 때 음량 낮추기용)
MUSIC_SAMPLE_RATE = 44100
MUSIC_CHANNELS = 2

_music_source_process = None  # yt-dlp 다운로드 프로세스
_music_decode_process = None  # ffmpeg 디코딩 프로세스 (원본 PCM 출력)
_music_generation = 0         # 재생이 바뀔 때마다 증가시켜서, 예전 재생 스레드가 스스로 멈추게 함
_music_volume = 1.0           # 0.0~1.0, 실시간으로 바꿀 수 있는 볼륨 배율 ("우무" 들을 때 덕킹용)
_music_paused = False         # F2로 일시정지/재생 토글
_playlist_queue: list[str] = []  # "순차재생" 모드일 때 아직 안 튼 곡 URL들
_playlist_mode = False           # 지금 순차재생 중인지 여부

# 개인 재생목록 - "순차" 라는 말이 들어가면 검색 대신 이 목록을 순서대로 재생함
MY_PLAYLIST_URL = "https://youtube.com/playlist?list=PLCurzq8YrVPI&si=dGlzMKlS7mFtoDA1"

# "OO 노래 틀어줘" / "OO 틀어봐" / "OO 들어줘"(STT 오인식) / "OO 재생해주세요" 처럼
# 끝에 재생 관련 어간+어미가 붙으면 그 앞부분을 검색어로 씀 (STT가 어미를 다르게 인식해도 넓게 잡히게)
MUSIC_PLAY_PATTERN = re.compile(r"(.+?)\s*(틀어|재생해|들려|들어|play)\s*(줘|봐|주세요|줄래)?\s*$")
MUSIC_STOP_PATTERN = re.compile(r"(정지|그만|멈춰|꺼줘|스톱|노래 꺼)")


class SpeechDetector:
    """Silero VAD (openWakeWord에 번들된 onnx)로 프레임 단위 '진짜 목소리 확률'을 계산.
    마이크 게인/잡음 크기와 무관하게 목소리인지 아닌지를 직접 판단하므로,
    마이크를 증폭해도 잡음 때문에 침묵 감지가 흔들리지 않음."""

    def __init__(self):
        model_path = os.path.join(
            os.path.dirname(openwakeword.__file__), "resources", "models", "silero_vad.onnx"
        )
        self.sess = ort.InferenceSession(model_path)
        self.reset()

    def reset(self):
        self.h = np.zeros((2, 1, 64), dtype=np.float32)
        self.c = np.zeros((2, 1, 64), dtype=np.float32)

    def is_speech(self, frame: np.ndarray) -> float:
        audio = (frame.astype(np.float32) / 32768.0).reshape(1, -1)
        sr = np.array(SAMPLE_RATE, dtype=np.int64)
        outputs = self.sess.run(None, {"input": audio, "sr": sr, "h": self.h, "c": self.c})
        prob, self.h, self.c = outputs
        return float(prob[0][0])


_vad = SpeechDetector()


def record_command(stream) -> np.ndarray | None:
    _vad.reset()
    chunks = []
    silence_start = None
    has_spoken = False
    start_time = time.time()

    while True:
        frame, _ = stream.read(FRAME_SIZE)
        chunks.append(frame.copy())
        speech_prob = _vad.is_speech(frame[:, 0])

        if speech_prob > VAD_SPEECH_THRESHOLD:
            has_spoken = True
            silence_start = None
        elif has_spoken:
            if silence_start is None:
                silence_start = time.time()
            elif time.time() - silence_start > SILENCE_DURATION_SEC:
                break

        if time.time() - start_time > MAX_COMMAND_SEC:
            break

    if not chunks or not has_spoken:
        return None
    return np.concatenate(chunks, axis=0)


def audio_to_wav_bytes(audio: np.ndarray) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio.tobytes())
    return buf.getvalue()


def transcribe(audio: np.ndarray) -> str:
    wav_bytes = audio_to_wav_bytes(audio)
    files = {"file": ("command.wav", wav_bytes, "audio/wav")}
    # language를 안 넘기면 Whisper가 자동으로 언어를 감지함 (한국어로 고정하면 영어/일본어도
    # 억지로 한국어로 인식해버려서 안 넘기는 쪽으로 바꿈)
    resp = requests.post(WHISPER_URL, files=files, timeout=30)
    resp.raise_for_status()
    return resp.json().get("text", "").strip()


def chat(text: str) -> str:
    # 매번 새 대화로 취급함 (이전 대화 맥락을 안 이어감 - 세션을 저장/재사용하지 않음)
    # umu=True: 백엔드가 세션/메시지를 아예 안 만들고 DB(chat_sessions/chat_messages)에
    # 기록을 전혀 안 남김 (우무와의 대화는 저장할 필요가 없어서 - 웹 챗봇의 시크릿 모드와는 별개)
    body = {"sessionId": None, "model": CHAT_MODEL, "content": text, "umu": True}
    headers = {"Authorization": f"Bearer {config.DEVICE_TOKEN}", "Content-Type": "application/json"}
    resp = requests.post(f"{BACKEND_URL}/chat/messages", json=body, headers=headers, stream=True, timeout=120)
    resp.raise_for_status()
    # requests가 서버 응답에 charset이 명시 안 돼있으면 기본으로 ISO-8859-1로 잘못 추측해서
    # 한글이 깨지는 유명한 문제가 있음 - 명시적으로 UTF-8로 지정해서 방지
    resp.encoding = "utf-8"

    full_text = ""
    for line in resp.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        try:
            data = json.loads(line[5:].strip())
        except json.JSONDecodeError:
            continue
        if "content" in data:
            full_text += data["content"]
        if "error" in data:
            print("  (챗봇 오류:", data["error"], ")")
    return full_text


def speak(text: str):
    text = text.strip()
    if not text:
        return
    resp = requests.post(MELOTTS_URL, json={"text": text, "speed": 1.0, "lang": "KR"}, timeout=60)
    resp.raise_for_status()
    sr, data = wavfile.read(io.BytesIO(resp.content))
    # sd.wait()로 재생 끝날 때까지 기다리면 그동안 새 "우무"를 못 들으므로, 재생만 시작하고 바로 리턴함
    # (다시 "우무"가 감지되면 main 루프에서 sd.stop()으로 즉시 끊어버림 - 말하는 중에 끼어들기 가능)
    sd.play(data, sr)


def _stop_music_processes():
    global _music_source_process, _music_decode_process
    if _music_decode_process is not None and _music_decode_process.poll() is None:
        _music_decode_process.terminate()
    if _music_source_process is not None and _music_source_process.poll() is None:
        _music_source_process.terminate()
    _music_decode_process = None
    _music_source_process = None


def stop_music():
    global _music_generation, _playlist_mode, _playlist_queue, _music_volume, _music_paused
    _music_generation += 1  # 지금 돌고 있는 재생 스레드는 이제 "낡은 것"이 되어 스스로 멈춤
    _playlist_mode = False
    _playlist_queue = []
    _music_volume = 1.0
    _music_paused = False
    _stop_music_processes()
    print("  (음악 정지)")


def is_music_playing() -> bool:
    return _music_decode_process is not None and _music_decode_process.poll() is None


def duck_music():
    # "우무" 부르는 소리가 잘 들리게 재생 중인 음악 음량을 확 낮춤 (끄지는 않음)
    global _music_volume
    if is_music_playing():
        _music_volume = 0.1


def unduck_music():
    global _music_volume
    _music_volume = 1.0


def toggle_pause_music():
    # F2 눌렀을 때 호출됨 (전역 단축키라 우무 창에 포커스 없어도 동작함)
    global _music_paused
    if not is_music_playing():
        return
    _music_paused = not _music_paused
    print(f"\n  (음악 {'일시정지' if _music_paused else '재생'})")


def _spawn_decoder(target: str):
    # target은 "ytsearch1:검색어" 같은 검색 쿼리이거나 실제 유튜브 URL이면 됨.
    # yt-dlp가 다운로드한 걸 ffmpeg로 원본 PCM(raw 오디오)까지 디코딩해서 파이썬이 직접 받음
    # (ffplay한테 통째로 맡기면 재생 중 볼륨을 못 바꿔서, 우리가 직접 스피커로 흘려보내야 함)
    # "yt-dlp" 명령을 PATH에서 못 찾는 환경(Scripts 폴더가 PATH에 안 잡힌 경우)이 있어서 파이썬 모듈로 직접 호출함
    global _music_source_process, _music_decode_process
    _music_source_process = subprocess.Popen(
        ["py", "-3.12", "-m", "yt_dlp", "-f", "bestaudio/best", "-o", "-", "--quiet", "--no-warnings",
         # 유튜브가 기본(web) 클라이언트를 자꾸 막아서, 다른 클라이언트로 위장하는 우회 옵션 추가
         "--extractor-args", "youtube:player_client=android,web",
         target],
        stdout=subprocess.PIPE,
    )
    _music_decode_process = subprocess.Popen(
        ["ffmpeg", "-loglevel", "quiet", "-i", "pipe:0",
         "-f", "s16le", "-ar", str(MUSIC_SAMPLE_RATE), "-ac", str(MUSIC_CHANNELS), "-"],
        stdin=_music_source_process.stdout, stdout=subprocess.PIPE,
    )
    _music_source_process.stdout.close()  # ffmpeg 쪽에서 파이프 끝(EOF)을 제대로 감지하게 함
    return _music_decode_process


def _playback_loop(decode_proc, generation):
    # 별도 스레드에서 실제로 소리를 읽어서 스피커로 흘려보내는 부분.
    # 매 조각(chunk)마다 그 시점의 _music_volume을 곱해서 내보내므로, 재생 중에도 음량을 실시간으로 바꿀 수 있음
    stream = sd.OutputStream(samplerate=MUSIC_SAMPLE_RATE, channels=MUSIC_CHANNELS, dtype="int16")
    stream.start()
    chunk_frames = 4096
    bytes_per_frame = 2 * MUSIC_CHANNELS  # int16 * 채널 수
    ended_naturally = False
    try:
        while generation == _music_generation:
            if _music_paused:
                time.sleep(0.05)
                continue
            data = decode_proc.stdout.read(chunk_frames * bytes_per_frame)
            if not data:
                ended_naturally = True
                break
            audio = np.frombuffer(data, dtype=np.int16).reshape(-1, MUSIC_CHANNELS)
            if _music_volume != 1.0:
                audio = (audio.astype(np.float32) * _music_volume).astype(np.int16)
            stream.write(audio)
    except Exception as e:
        print("  음악 재생 오류:", e)
    finally:
        stream.stop()
        stream.close()

    # 이 스레드가 여전히 "현재" 재생이었고(다른 곡으로 안 바뀌었고), 자연스럽게 곡이 끝난 거면
    # 재생목록 모드일 때 다음 곡으로 자동 진행
    if ended_naturally and generation == _music_generation and _playlist_mode:
        play_next_in_playlist()


def _start_playback(target: str):
    global _music_generation, _music_paused
    _stop_music_processes()
    _music_generation += 1
    generation = _music_generation
    _music_paused = False
    decode_proc = _spawn_decoder(target)
    threading.Thread(target=_playback_loop, args=(decode_proc, generation), daemon=True).start()


def play_music(query: str):
    global _music_volume
    _music_volume = 1.0
    search_query = query if "노래" in query else f"{query} 노래"
    print(f"  (음악 검색 중: {search_query})")
    try:
        _start_playback(f"ytsearch1:{search_query}")
        print("  (재생 시작)")
    except FileNotFoundError as e:
        print("  음악 재생 오류 (yt-dlp/ffmpeg가 설치·PATH 등록 안 됐을 수 있어요):", e)
    except Exception as e:
        print("  음악 재생 오류:", e)


def play_next_in_playlist():
    global _playlist_queue, _music_volume
    if not _playlist_queue:
        print("  (재생목록이 끝났어요)")
        stop_music()
        return
    url = _playlist_queue.pop(0)
    print(f"  (다음 곡: {url})")
    _music_volume = 1.0
    try:
        _start_playback(url)
    except Exception as e:
        print("  음악 재생 오류:", e)


def play_my_playlist():
    global _playlist_mode, _playlist_queue
    stop_music()
    print("  (내 재생목록 불러오는 중...)")
    try:
        result = subprocess.run(
            ["py", "-3.12", "-m", "yt_dlp", "--flat-playlist", "--print", "url",
             "--extractor-args", "youtube:player_client=android,web",
             MY_PLAYLIST_URL],
            capture_output=True, text=True, timeout=30,
        )
        urls = [u.strip() for u in result.stdout.strip().split("\n") if u.strip()]
        if not urls:
            print("  (재생목록을 못 불러왔어요)", result.stderr.strip())
            return
        _playlist_queue = urls
        _playlist_mode = True
        print(f"  (총 {len(urls)}곡, 순서대로 재생할게요)")
        play_next_in_playlist()
    except Exception as e:
        print("  재생목록 불러오기 오류:", e)


def try_handle_music(text: str) -> bool:
    # Whisper가 문장 끝에 마침표/물음표 등을 붙여서 인식하는 경우가 많아서, 트리거 매칭 전에 제거함
    stripped = text.strip().rstrip(".,!?~ ")

    if MUSIC_STOP_PATTERN.search(stripped) and (is_music_playing() or _playlist_mode):
        stop_music()
        return True

    match = MUSIC_PLAY_PATTERN.match(stripped)
    if not match:
        return False
    query = match.group(1).strip()
    if not query:
        return False

    # "순차"라는 말이 들어가면 검색하지 않고 내 재생목록을 순서대로 재생함
    if "순차" in query:
        play_my_playlist()
        return True

    play_music(query)
    return True


def handle_conversation(stream):
    playsound(SOUND_WAKE)
    print("  (듣는 중...)")
    audio = record_command(stream)

    playsound(SOUND_DONE_LISTENING)

    if audio is None or len(audio) < SAMPLE_RATE * 0.3:
        print("  (아무 말도 못 들었어요)")
        return

    print("  (음성 인식 중...)")
    try:
        text = transcribe(audio)
    except Exception as e:
        print("  STT 오류:", e)
        return
    if not text:
        print("  (인식된 내용이 없어요)")
        return
    print(f"  나: {text}")

    if try_handle_music(text):
        return

    print("  (생각 중...)")
    try:
        reply = chat(text)
    except Exception as e:
        print("  챗봇 오류:", e)
        return
    print(f"  우무: {reply}")

    try:
        speak(reply)
    except Exception as e:
        print("  TTS 오류:", e)


def main():
    print("=" * 50)
    print("우무 음성 비서 시작. '우무'라고 불러주세요.")
    print("종료하려면 Ctrl+C")
    print("=" * 50)

    if not os.path.exists(WAKEWORD_MODEL_PATH):
        print(f"웨이크워드 모델을 찾을 수 없어요: {WAKEWORD_MODEL_PATH}")
        return

    model = Model(wakeword_models=[WAKEWORD_MODEL_PATH], inference_framework="onnx")

    # F2로 음악 일시정지/재생 토글 (전역 단축키 - 이 창에 포커스 없어도 동작함)
    keyboard.add_hotkey("f2", toggle_pause_music)
    print("F2를 누르면 재생 중인 음악을 일시정지/재생할 수 있어요.")

    stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", blocksize=FRAME_SIZE)
    stream.start()

    try:
        while True:
            frame, _ = stream.read(FRAME_SIZE)
            pcm = frame[:, 0]
            pred = model.predict(pcm)
            score = pred.get("woomoo", 0)

            if score > WAKEWORD_THRESHOLD:
                print(f"\n'우무' 감지! (score={score:.2f})")
                model.reset()
                sd.stop()  # 우무가 말하는 중이었으면 즉시 끊고 새로 들음 (중간에 끼어들기)
                # 음악은 끄지 않고 음량만 확 낮춰서 명령이 잘 들리게 함 (끝나면 자동으로 원래대로)
                music_was_playing = is_music_playing()
                if music_was_playing:
                    duck_music()
                handle_conversation(stream)
                if music_was_playing:
                    unduck_music()
                print("\n다시 대기 중...")
    except KeyboardInterrupt:
        print("\n종료합니다.")
    finally:
        stream.stop()
        stream.close()


if __name__ == "__main__":
    main()
