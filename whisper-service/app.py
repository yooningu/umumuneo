import tempfile
import os

from fastapi import FastAPI, UploadFile, File, Form
from faster_whisper import WhisperModel

app = FastAPI()

# CPU 전용 환경 기준. GPU가 있으면 device="cuda", compute_type="float16"로 바꾸면 훨씬 빠름.
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "medium")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str | None = Form(default=None)):
    suffix = os.path.splitext(file.filename or "")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # language=None이면 자동 감지 (Whisper는 다국어를 기본 지원)
        # vad_filter: 녹음 시작/끝의 무음 구간을 걸러내서 짧은 녹음의 오인식을 줄임
        # (버튼 누르고 말 시작하기 전/후 무음이 껴서 엉뚱하게 인식되는 문제 방지)
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )
        text = "".join(seg.text for seg in segments).strip()
        return {"text": text, "language": info.language}
    finally:
        os.remove(tmp_path)
