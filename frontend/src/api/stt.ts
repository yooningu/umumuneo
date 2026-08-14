import client from './client';

// 로컬 Whisper STT (language 생략하면 자동 감지)
export const transcribeAudio = async (blob: Blob, language?: string): Promise<string> => {
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');
  if (language) formData.append('language', language);
  const { data } = await client.post('/stt/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.text;
};
