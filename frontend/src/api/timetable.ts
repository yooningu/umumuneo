import client from './client';
import type { Timetable, TimetableRequest } from '../types';

export const getTimetables = async (): Promise<Timetable[]> => {
  const { data } = await client.get('/timetable');
  return data;
};

export const createTimetable = async (request: TimetableRequest): Promise<void> => {
  await client.post('/timetable', request);
};

export const updateTimetable = async (id: string, request: TimetableRequest): Promise<void> => {
  await client.put(`/timetable/${id}`, request);
};

export const deleteTimetable = async (id: string): Promise<void> => {
  await client.delete(`/timetable/${id}`);
};
