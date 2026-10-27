import client from './client';
import type { Timetable, TimetableRequest } from '../types';

export const getTimetables = async (): Promise<Timetable[]> => {
  const { data } = await client.get('/timetable');
  return data;
};

// 요일을 여러 개 선택하면 서버가 한 묶음(같은 groupId)으로 요일 수만큼 생성함
export const createTimetableGroup = async (request: TimetableRequest): Promise<void> => {
  await client.post('/timetable', request);
};

// groupId(없던 예전 데이터는 그 행의 id) 기준으로 묶음 전체를 같이 수정
export const updateTimetableGroup = async (groupId: string, request: TimetableRequest): Promise<void> => {
  await client.put(`/timetable/group/${groupId}`, request);
};

// groupId(없던 예전 데이터는 그 행의 id) 기준으로 묶음 전체를 같이 삭제
export const deleteTimetableGroup = async (groupId: string): Promise<void> => {
  await client.delete(`/timetable/group/${groupId}`);
};
