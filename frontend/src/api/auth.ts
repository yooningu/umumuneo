import client from './client';
import type { LoginResponse, SessionInfo, User } from '../types';

export const kakaoLogin = async (code: string, rememberMe: boolean): Promise<LoginResponse> => {
  const { data } = await client.post('/auth/kakao', { code, rememberMe });
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

// 설정 > 로그인된 기기 목록
export const getSessions = async (): Promise<SessionInfo[]> => {
  const { data } = await client.get('/auth/sessions');
  return data;
};

// 기기 하나만 원격 로그아웃
export const revokeSession = async (sessionId: string): Promise<void> => {
  await client.delete(`/auth/sessions/${sessionId}`);
};

// 모든 기기에서 로그아웃 (지금 기기 포함)
export const revokeAllSessions = async (): Promise<void> => {
  await client.delete('/auth/sessions');
};
