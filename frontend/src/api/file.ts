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
  source?: 'UPLOAD' | 'CHATBOT' | 'EMAIL'
): Promise<FileItem[]> => {
  const formData = new FormData();
  files.forEach(f => formData.append('file', f));
  if (parentId) formData.append('parentId', parentId);
  if (source) formData.append('source', source);
  const res = await client.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const createDirectory = async (name: string, parentId?: string): Promise<void> => {
  await client.post('/files/directory', { name, parentId });
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
