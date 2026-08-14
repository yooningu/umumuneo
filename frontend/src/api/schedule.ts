import client from './client';
import type { Schedule, ScheduleRequest } from '../types';

export const getSchedules = async (
  from: string,
  to: string,
  type?: string
): Promise<Schedule[]> => {
  const { data } = await client.get('/schedules', { params: { from, to, type } });
  return data;
};

export const getSchedule = async (id: string): Promise<Schedule> => {
  const { data } = await client.get(`/schedules/${id}`);
  return data;
};

export const createSchedule = async (request: ScheduleRequest): Promise<void> => {
  await client.post('/schedules', request);
};

export const updateSchedule = async (id: string, request: ScheduleRequest): Promise<void> => {
  await client.put(`/schedules/${id}`, request);
};

export const deleteSchedule = async (id: string): Promise<void> => {
  await client.delete(`/schedules/${id}`);
};
