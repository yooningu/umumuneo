import client from './client';
import type { ChatSession, ChatMessage } from '../types';

export const getSessions = async (): Promise<ChatSession[]> => {
  const res = await client.get('/chat/sessions');
  return res.data;
};

export const getMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  const res = await client.get(`/chat/sessions/${sessionId}/messages`);
  return res.data;
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  await client.delete(`/chat/sessions/${sessionId}`);
};

// SSE 스트리밍은 fetch로 직접 처리 (ChatWidget에서 사용)
export const sendMessage = (
  content: string,
  sessionId: string | null,
  model: string,
  onChunk: (text: string) => void,
  onDone: (sessionId: string) => void,
  onError: (err: string) => void,
  images?: string[], // base64 인코딩된 이미지 (data URI 접두사 제외). 있으면 백엔드가 vision 모델로 전환
  hasAttachment?: boolean, // 이미지가 아닌 파일이라도 첨부됐으면 true (역시 vision 모델로 전환)
  audio?: string[], // base64 인코딩된 음성 파일. 백엔드가 STT로 변환해서 프롬프트에 반영
  sendableFiles?: { name: string; fileId: string; isImage: boolean }[], // 첨부 파일. 공개 링크로 "나에게 보내기"할 때 사용
  secret?: boolean, // true면 DB에 저장 안 하고 서버 메모리에만 대화를 유지 (시크릿 모드)
) => {
  const accessToken = localStorage.getItem('accessToken');
  fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ sessionId, model, content, images, hasAttachment, audio, sendableFiles, secret }),
  }).then(async res => {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const processLine = (line: string) => {
      if (!line.startsWith('data:')) return;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json.content) onChunk(json.content);
        if (json.sessionId) onDone(json.sessionId);
        if (json.error) onError(json.error);
      } catch {}
    };

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      // stream: true로 디코딩해야 한글처럼 여러 바이트짜리 문자가 청크 경계에서 잘려도 깨지지 않는다
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      // 마지막 조각은 아직 다 안 온 줄일 수 있으니 버퍼에 남겨두고 다음 read()에서 이어붙인다
      buffer = lines.pop() ?? '';
      lines.forEach(processLine);
    }
    // 스트림이 끝난 뒤 버퍼에 남은 마지막 줄 처리
    processLine(buffer);
  }).catch(e => onError(e.message));
};
