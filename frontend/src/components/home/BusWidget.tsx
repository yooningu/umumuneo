import { useEffect, useState } from 'react';
import { getMyBusStops, removeBusStop, getBusArrivals } from '../../api/bus';
import type { BusStop, BusArrival } from '../../types';
import Skeleton from '../common/Skeleton';
import BusStopPickerModal from './BusStopPickerModal';
import styles from './BusWidget.module.css';

// 초 단위 도착예상시간을 "N분 후"로 변환 (1분 미만이면 "곧 도착")
function formatArrivalSeconds(sec: number | null): string {
  if (sec == null) return '정보 없음';
  const min = Math.round(sec / 60);
  return min <= 0 ? '곧 도착' : `${min}분 후`;
}

// 내가 즐겨찾는 정류장/노선의 실시간 도착정보만 보여주는 위젯.
// 새 정류장/노선 등록은 "+" 버튼으로 뜨는 BusStopPickerModal에서 함
export default function BusWidget() {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [arrivalsByStop, setArrivalsByStop] = useState<Map<string, BusArrival[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadStops = () => {
    setLoading(true);
    getMyBusStops()
      .then(list => {
        setStops(list);
        list.forEach(stop => {
          getBusArrivals(stop.id)
            .then(arrivals => setArrivalsByStop(prev => new Map(prev).set(stop.id, arrivals)))
            .catch(console.error);
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStops();
  }, []);

  const handleRemoveStop = async (stopId: string) => {
    setRemovingId(stopId);
    try {
      await removeBusStop(stopId);
      setStops(prev => prev.filter(s => s.id !== stopId));
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>내 버스</span>
        <button type="button" className={styles.addBtn} onClick={() => setPickerOpen(true)} aria-label="정류장 추가">
          +
        </button>
      </div>

      {loading ? (
        <div className={styles.skeletonWrap}>
          <Skeleton width="90%" />
          <Skeleton width="70%" />
          <Skeleton width="80%" />
        </div>
      ) : stops.length === 0 ? (
        <div className={styles.empty}>등록된 정류장이 없어요. + 버튼으로 추가해보세요.</div>
      ) : (
        <div className={styles.list}>
          {stops.map(stop => {
            const arrivals = arrivalsByStop.get(stop.id);
            return (
              <div key={stop.id} className={styles.stopCard}>
                <div className={styles.stopHeader}>
                  <span className={styles.stopName}>{stop.nickname || stop.stopName}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleRemoveStop(stop.id)}
                    disabled={removingId === stop.id}
                    aria-label="정류장 삭제"
                  >
                    ×
                  </button>
                </div>
                {stop.lines.length === 0 ? (
                  <div className={styles.noLines}>추적 중인 노선이 없어요</div>
                ) : (
                  stop.lines.map(line => {
                    const matched = arrivals?.find(a => a.routeId === line.routeId);
                    return (
                      <div key={line.id} className={styles.lineRow}>
                        <span className={styles.lineNo}>{line.lineNo}번</span>
                        <span className={styles.lineArrival}>
                          {arrivals ? formatArrivalSeconds(matched?.arrivalSeconds ?? null) : '불러오는 중...'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <BusStopPickerModal
          onClose={() => setPickerOpen(false)}
          onAdded={() => {
            setPickerOpen(false);
            loadStops();
          }}
        />
      )}
    </div>
  );
}
