import os
import tempfile

from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI()

# 언어별로 최초 요청 때 딱 한 번만 모델을 로드해서 캐싱한다 (언어마다 체크포인트가 따로 있음)
_models = {}  # lang -> (model, speaker_id)


def get_model(lang: str):
    if lang not in _models:
        from melo.api import TTS
        device = os.environ.get("MELO_DEVICE", "cpu")
        model = TTS(language=lang, device=device)
        # 대부분 언어가 화자 하나뿐이라 spk2id 딕셔너리의 첫 번째 값을 그대로 씀
        speaker_id = list(model.hps.data.spk2id.values())[0]
        _models[lang] = (model, speaker_id)
    return _models[lang]


class SynthesizeRequest(BaseModel):
    text: str
    speed: float = 1.0  # 1.0이 기본 속도, 낮추면 느리게/높이면 빠르게
    lang: str = "KR"  # KR, JP, EN, ZH, ES, FR 등 MeloTTS가 지원하는 언어 코드


@app.get("/health")
def health():
    return {"status": "ok"}


# 테스트용: 텍스트를 넣으면 wav 오디오를 바로 응답으로 준다 (브라우저 주소창에 못 넣고 POST로만 됨 - curl이나 /docs에서 테스트)
@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    model, speaker_id = get_model(req.lang)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        model.tts_to_file(req.text, speaker_id, tmp_path, speed=req.speed)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        return Response(content=audio_bytes, media_type="audio/wav")
    finally:
        os.remove(tmp_path)
