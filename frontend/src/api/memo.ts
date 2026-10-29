import client from './client';
import type { Memo } from '../types';

export const getMemo = async (): Promise<Memo> => {
  const { data } = await client.get('/memo');
  return data;
};

export const updateMemo = async (content: string): Promise<void> => {
  await client.put('/memo', { content });
};
