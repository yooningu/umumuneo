import client from './client';
import type { Holiday } from '../types';

export const getHolidays = async (year: number, month: number): Promise<Holiday[]> => {
  const { data } = await client.get('/holidays', { params: { year, month } });
  return data;
};
