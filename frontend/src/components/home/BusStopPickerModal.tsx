import { useState } from 'react';
import { findNearbyStops, findNearbyStopsByAddress, getRoutesForStop, addBusStop, addBusLine } from '../../api/bus';
import type { NearbyStop, StopRoute } from '../../types';
import KakaoMap from '../common/KakaoMap';
import styles from './BusStopPickerModal.module.css';

type Step = 'search' | 'pickStop' | 'pickLines';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

// 정류장 즐겨찾기 등록 흐름 - 지도를 눌러서 위치를 고르거나(카카오맵), 주소를 직접 입력해서
// → 정류장 선택 → 노선 선택, 3단계로 구성
export default function BusStopPickerModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [selectedStop, setSelectedStop] = useState<NearbyStop | null>(null);
  const [routes, setRoutes] = useState<StopRoute[]>([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const handleFindAtPicked = async () => {
    if (!pickedLatLng || loading) return;
    setLoading(true);
    setError(null);
    try {
      const stops = await findNearbyStops(pickedLatLng.lat, pickedLatLng.lng);
      setNearbyStops(stops);
      setStep('pickStop');
    } catch (e) {
      console.error(e);
      setError('주변 정류장을 찾지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindByAddress = async () => {
    if (!addressInput.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const stops = await findNearbyStopsByAddress(addressInput.trim());
      setNearbyStops(stops);
      setStep('pickStop');
    } catch (e) {
      console.error(e);
      setError('주소를 찾을 수 없거나 주변 정류장을 찾지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickStop = async (stop: NearbyStop) => {
    setSelectedStop(stop);
    setLoading(true);
    setError(null);
    try {
      const stopRoutes = await getRoutesForStop(stop.cityCode, stop.nodeId);
      setRoutes(stopRoutes);
      setStep('pickLines');
    } catch (e) {
      console.error(e);
      setError('경유 노선을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoute = (routeId: string) => {
    setSelectedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedStop || saving) return;
    setSaving(true);
    setError(null);
    try {
      const stop = await addBusStop({
        nodeId: selectedStop.nodeId,
        cityCode: selectedStop.cityCode,
        stopName: selectedStop.stopName,
        nickname: nickname.trim() || undefined,
        latitude: selectedStop.latitude,
        longitude: selectedStop.longitude,
      });
      const chosenRoutes = routes.filter(r => selectedRouteIds.has(r.routeId));
      for (const route of chosenRoutes) {
        await addBusLine(stop.id, { routeId: route.routeId, lineNo: route.routeNo });
      }
      onAdded();
    } catch (e) {
      console.error(e);
      setError('정류장을 등록하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <div className={styles.title}>정류장 추가</div>

        {step === 'search' && (
          <>
            <p className={styles.description}>지도를 눌러 위치를 선택해주세요.</p>
            <KakaoMap onSelect={(lat, lng) => setPickedLatLng({ lat, lng })} height={200} />
            <button
              className={styles.primaryBtn}
              style={{ marginTop: 10 }}
              onClick={handleFindAtPicked}
              disabled={!pickedLatLng || loading}
            >
              {loading ? '찾는 중...' : '이 위치 주변 정류장 찾기'}
            </button>
            <div className={styles.orDivider}>또는</div>
            <div className={styles.addressRow}>
              <input
                className={styles.nicknameInput}
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFindByAddress()}
                placeholder="도로명 주소 입력 (예: 서울특별시 중구 세종대로 110)"
                disabled={loading}
              />
              <button
                className={styles.cancelBtn}
                onClick={handleFindByAddress}
                disabled={!addressInput.trim() || loading}
              >
                {loading ? '찾는 중...' : '검색'}
              </button>
            </div>
          </>
        )}

        {step === 'pickStop' && (
          <>
            <p className={styles.description}>등록할 정류장을 선택해주세요.</p>
            <div className={styles.list}>
              {nearbyStops.length === 0 ? (
                <div className={styles.empty}>주변에서 정류장을 찾지 못했어요.</div>
              ) : (
                nearbyStops.map(stop => (
                  <button
                    key={stop.nodeId}
                    className={styles.listItem}
                    onClick={() => handlePickStop(stop)}
                    disabled={loading}
                  >
                    {stop.stopName}
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {step === 'pickLines' && selectedStop && (
          <>
            <p className={styles.description}>{selectedStop.stopName} - 추적할 노선을 선택해주세요.</p>
            <input
              className={styles.nicknameInput}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="별칭 (선택, 예: 집 앞)"
            />
            <div className={styles.list}>
              {routes.length === 0 ? (
                <div className={styles.empty}>이 정류장을 지나는 노선 정보가 없어요.</div>
              ) : (
                routes.map(route => (
                  <label key={route.routeId} className={styles.routeItem}>
                    <input
                      type="checkbox"
                      checked={selectedRouteIds.has(route.routeId)}
                      onChange={() => toggleRoute(route.routeId)}
                    />
                    <span className={styles.routeNo}>{route.routeNo}번</span>
                    <span className={styles.routeDesc}>{route.startStopName} → {route.endStopName}</span>
                  </label>
                ))
              )}
            </div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>취소</button>
          {step === 'pickLines' && (
            <button className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? '등록 중...' : '등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
