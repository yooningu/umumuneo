import client from './client';
import type { User } from '../types';

export const getMe = async (): Promise<User> => {
  const res = await client.get('/users/me');
  return res.data;
};

export const updateMe = async (data: Partial<User>): Promise<void> => {
  await client.patch('/users/me', data);
};
