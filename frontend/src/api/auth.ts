import client from './client';
import type { LoginResponse, User } from '../types';

export const kakaoLogin = async (code: string): Promise<LoginResponse> => {
  const { data } = await client.post('/auth/kakao', { code });
  return data;
};

export const refreshToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  const { data } = await client.post('/auth/refresh', { refreshToken });
  return data;
};

export const logout = async (): Promise<void> => {
  await client.post('/auth/logout');
};

export const getMe = async (): Promise<User> => {
  const { data } = await client.get('/users/me');
  return data;
};
