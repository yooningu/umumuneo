import tempfile
import os

from fastapi import FastAPI, UploadFile, File
from paddleocr import PaddleOCR
import fitz  # PyMuPDF

app = FastAPI()

# 이미지 안의 글자를 읽어내는 OCR 엔진. 최초 실행 시 모델을 다운로드해서 시간이 좀 걸리고
# (~/.paddleocr에 캐시됨, 그다음부턴 빠름), 모듈 로드 시 한 번만 만들어서 재사용한다
# (요청마다 새로 만들면 매번 모델을 다시 불러와야 해서 느림 - whisper-service와 같은 이유).
# lang="korean": 한글 인식 전용 모델 (영문/숫자도 어느 정도 같이 인식됨)
OCR_LANG = os.environ.get("OCR_LANG", "korean")
ocr_engine = PaddleOCR(use_angle_cls=True, lang=OCR_LANG, show_log=False)


@app.get("/health")
def health():
    return {"status": "ok", "lang": OCR_LANG}


# 이미지에서 텍스트 추출 (PaddleOCR)
@app.post("/extract/image")
async def extract_image(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".png"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # result 구조: [ [ [box, (text, score)], ... ] ] - 이미지 1장 기준 result[0]에 줄별 인식 결과가 들어있음
        result = ocr_engine.ocr(tmp_path, cls=True)
        lines = []
        for page in result or []:
            for line in page or []:
                text = line[1][0]
                if text:
                    lines.append(text)
        return {"text": "\n".join(lines)}
    except Exception as e:
        return {"text": "", "error": str(e)}
    finally:
        os.remove(tmp_path)


# PDF에서 텍스트 추출 (PyMuPDF) - 이미지로 스캔된 PDF(텍스트 레이어 없음)는 못 뽑아냄
@app.post("/extract/pdf")
async def extract_pdf(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        doc = fitz.open(tmp_path)
        page_count = doc.page_count
        try:
            text = "\n".join(page.get_text() for page in doc)
        finally:
            doc.close()
        return {"text": text.strip(), "pages": page_count}
    except Exception as e:
        return {"text": "", "pages": 0, "error": str(e)}
    finally:
        os.remove(tmp_path)
