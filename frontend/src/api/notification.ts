import client from './client';
import type { Notification } from '../types';

export const getNotifications = async (): Promise<Notification[]> => {
  const res = await client.get('/notifications');
  return res.data;
};
