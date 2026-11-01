import client from './client';
import type { User } from '../types';

export const getMe = async (): Promise<User> => {
  const res = await client.get('/users/me');
  return res.data;
};

export const updateMe = async (data: Partial<User>): Promise<void> => {
  await client.patch('/users/me', data);
};

// 회원탈퇴 요청 - 바로 지워지지 않고 서버에서 30일 뒤에 실제로 삭제됨 (그 전까진 로그인만 막힘)
export const deleteMe = async (): Promise<void> => {
  await client.delete('/users/me');
};
