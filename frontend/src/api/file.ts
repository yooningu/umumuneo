import client from './client';
import type { FileItem } from '../types';

export const getFiles = async (params?: {
  parentId?: string;
  isFavorite?: boolean;
  search?: string;
  source?: 'UPLOAD' | 'CHATBOT' | 'EMAIL';
}): Promise<FileItem[]> => {
  const res = await client.get('/files', { params });
  return res.data;
};

export const uploadFiles = async (
  files: File[],
  parentId?: string,
  source?: 'UPLOAD' | 'CHATBOT' | 'EMAIL',
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<FileItem[]> => {
  const formData = new FormData();
  files.forEach(f => formData.append('file', f));
  if (parentId) formData.append('parentId', parentId);
  if (source) formData.append('source', source);
  const res = await client.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0)
      : undefined,
    signal,
  });
  return res.data;
};

export const createDirectory = async (name: string, parentId?: string): Promise<FileItem> => {
  const res = await client.post('/files/directory', { name, parentId });
  return res.data;
};

// ===== 큰 파일 조각(청크) 업로드 - Cloudflare가 프록시 요청 본문을 100MB로 제한해서,
// 그보다 큰 파일은 /files/upload로 한 번에 못 올리고 조각내서 나눠 보내야 함 =====

export const initChunkedUpload = async (params: {
  filename: string;
  totalSize: number;
  totalChunks: number;
  contentType?: string;
  parentId?: string;
  source?: 'UPLOAD' | 'CHATBOT' | 'EMAIL';
}): Promise<string> => {
  const res = await client.post('/files/upload/init', params);
  return res.data.sessionId;
};

export const uploadChunk = async (
  sessionId: string,
  chunkIndex: number,
  chunk: Blob,
  signal?: AbortSignal
): Promise<void> => {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  formData.append('chunkIndex', String(chunkIndex));
  formData.append('chunk', chunk);
  await client.post('/files/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
  });
};

// 중간에 끊겼다가 재개할 때, 서버에 이미 저장된 조각 번호들을 받아와서 중복 전송을 피하는 데 씀
export const getUploadedChunks = async (sessionId: string): Promise<number[]> => {
  const res = await client.get(`/files/upload/${sessionId}/chunks`);
  return res.data;
};

export const completeChunkedUpload = async (sessionId: string): Promise<FileItem> => {
  const res = await client.post('/files/upload/complete', { sessionId });
  return res.data;
};

export const cancelChunkedUpload = async (sessionId: string): Promise<void> => {
  await client.delete(`/files/upload/${sessionId}`);
};

export const toggleFavorite = async (id: string): Promise<void> => {
  await client.patch(`/files/${id}/favorite`);
};

export const renameFile = async (id: string, name: string): Promise<void> => {
  await client.patch(`/files/${id}`, { name });
};

export const downloadFile = async (id: string, filename: string): Promise<void> => {
  const res = await client.get(`/files/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const deleteFile = async (id: string): Promise<void> => {
  await client.delete(`/files/${id}`);
};

// 다른 폴더로 이동 (드래그앤드롭) - parentId가 undefined/null이면 최상위(루트)로 이동
export const moveFile = async (id: string, parentId: string | null): Promise<void> => {
  await client.patch(`/files/${id}/move`, { parentId });
};

// 썸네일/큰 미리보기용 - 인증 헤더가 필요해서 <img src="..."> 로 바로 못 쓰고,
// blob으로 받아서 object URL을 만들어야 함 (다 쓰면 호출부에서 revokeObjectURL로 정리해야 함)
export const getPreviewBlobUrl = async (id: string): Promise<string> => {
  const res = await client.get(`/files/${id}/view`, { responseType: 'blob' });
  return window.URL.createObjectURL(res.data);
};

// NAS에 이미 올라가 있는 파일을 챗봇에 첨부할 때, vision 모델에 넘길 base64로 바로 변환하려고
// object URL이 아니라 Blob 원본 그대로 받아옴
export const getFileBlob = async (id: string): Promise<Blob> => {
  const res = await client.get(`/files/${id}/view`, { responseType: 'blob' });
  return res.data;
};
