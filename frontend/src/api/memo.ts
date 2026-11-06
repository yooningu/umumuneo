import client from './client';
import type { Memo } from '../types';

export const getMemos = async (): Promise<Memo[]> => {
  const { data } = await client.get('/memo');
  return data;
};

export const createMemo = async (): Promise<Memo> => {
  const { data } = await client.post('/memo');
  return data;
};

export const updateMemo = async (memoId: string, content: string): Promise<void> => {
  await client.put(`/memo/${memoId}`, { content });
};

export const deleteMemo = async (memoId: string): Promise<void> => {
  await client.delete(`/memo/${memoId}`);
};
