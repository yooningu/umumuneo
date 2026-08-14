import client from './client';
import type { FileItem } from '../types';

export const getFiles = async (params?: {
  parentId?: string;
  isFavorite?: boolean;
  search?: string;
}): Promise<FileItem[]> => {
  const res = await client.get('/files', { params });
  return res.data;
};

export const uploadFiles = async (files: File[], parentId?: string): Promise<FileItem[]> => {
  const formData = new FormData();
  files.forEach(f => formData.append('file', f));
  if (parentId) formData.append('parentId', parentId);
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
