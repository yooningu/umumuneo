import client from './client';
import type { BusStop, NearbyStop, StopRoute, BusArrival } from '../types';

// GPS로 근처 정류장 후보 검색 (아직 즐겨찾기 등록 전)
export const findNearbyStops = async (lat: number, lon: number): Promise<NearbyStop[]> => {
  const { data } = await client.get('/bus/stops/nearby', { params: { lat, lon } });
  return data;
};

// 주소 문자열로 근처 정류장 후보 검색 (GPS 권한이 없을 때의 대안)
export const findNearbyStopsByAddress = async (address: string): Promise<NearbyStop[]> => {
  const { data } = await client.get('/bus/stops/nearby', { params: { address } });
  return data;
};

// 정류장을 지나는 노선 목록 (즐겨찾기에 추가할 노선 선택용)
export const getRoutesForStop = async (cityCode: string, nodeId: string): Promise<StopRoute[]> => {
  const { data } = await client.get('/bus/stops/routes', { params: { cityCode, nodeId } });
  return data;
};

export const getMyBusStops = async (): Promise<BusStop[]> => {
  const { data } = await client.get('/bus/my-stops');
  return data;
};

export const addBusStop = async (req: {
  nodeId: string;
  cityCode: string;
  stopName: string;
  nickname?: string;
  latitude: number;
  longitude: number;
}): Promise<BusStop> => {
  const { data } = await client.post('/bus/my-stops', req);
  return data;
};

export const removeBusStop = async (stopId: string): Promise<void> => {
  await client.delete(`/bus/my-stops/${stopId}`);
};

export const addBusLine = async (
  stopId: string,
  req: { routeId: string; lineNo: string; alarmMinutes?: number | null }
): Promise<BusStop> => {
  const { data } = await client.post(`/bus/my-stops/${stopId}/lines`, req);
  return data;
};

export const removeBusLine = async (stopId: string, lineId: string): Promise<void> => {
  await client.delete(`/bus/my-stops/${stopId}/lines/${lineId}`);
};

export const getBusArrivals = async (stopId: string): Promise<BusArrival[]> => {
  const { data } = await client.get(`/bus/my-stops/${stopId}/arrivals`);
  return data;
};
