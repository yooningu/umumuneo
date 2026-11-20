import client from './client';
import type { DayForecast } from '../types';

export const getWeatherForecast = async (): Promise<DayForecast[]> => {
  const { data } = await client.get('/weather');
  return data;
};
