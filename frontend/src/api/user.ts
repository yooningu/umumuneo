import client from './client';
import type { User, LocationInfo } from '../types';

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

// 날씨/버스 기능에 쓰는 내 기준 위치
export const getLocation = async (): Promise<LocationInfo> => {
  const { data } = await client.get('/users/me/location');
  return data;
};

// 도로명 주소 문자열로 위치 설정 (서버가 VWorld로 좌표/행정동/기상청 격자좌표까지 알아서 계산)
export const setLocationByAddress = async (address: string): Promise<LocationInfo> => {
  const { data } = await client.put('/users/me/location', { address });
  return data;
};

// GPS 좌표로 위치 설정 (서버가 VWorld 역지오코딩으로 행정동/기상청 격자좌표까지 알아서 계산)
export const setLocationByGps = async (latitude: number, longitude: number): Promise<LocationInfo> => {
  const { data } = await client.put('/users/me/location', { latitude, longitude });
  return data;
};

// GPS 좌표를 행정동 이름으로 미리보기만(저장 안 함) - "저장" 누르기 전에 입력창/지도에 표시용
export const previewLocationByGps = async (latitude: number, longitude: number): Promise<LocationInfo> => {
  const { data } = await client.get('/users/me/location/preview', { params: { lat: latitude, lon: longitude } });
  return data;
};
