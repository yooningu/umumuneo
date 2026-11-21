import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '../../utils/kakaoMapLoader';
import styles from './KakaoMap.module.css';

interface MarkerSpec {
  lat: number;
  lng: number;
}

interface Props {
  center?: { lat: number; lng: number };
  pin?: { lat: number; lng: number } | null; // 외부(예: GPS 결과)에서 지정하는 선택 위치 - 바뀌면 지도가 그쪽으로 이동하고 마커도 거기로 옮겨짐
  markers?: MarkerSpec[]; // 검색 결과 등 추가로 찍어줄 마커 (선택 마커와는 별개)
  onSelect?: (lat: number, lng: number) => void; // 지도를 클릭하면 그 위치에 마커를 찍고 좌표를 알려줌
  height?: number | string;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // 서울시청 - 초기 중심 좌표 기본값

// 지도를 클릭해서(또는 pin prop으로 외부에서) 위치를 고르는 공용 카카오맵 컴포넌트.
// GPS 권한에 기대지 않고도, 눈으로 보면서 직접 위치를 지정할 수 있게 하는 용도
export default function KakaoMap({ center, pin, markers = [], onSelect, height = 260 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const pickMarkerRef = useRef<any>(null);
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = window.kakao;
        const initialPoint = pinRef.current ?? center ?? DEFAULT_CENTER;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(initialPoint.lat, initialPoint.lng),
          level: 4,
        });
        mapRef.current = map;

        if (pinRef.current) {
          pickMarkerRef.current = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(pinRef.current.lat, pinRef.current.lng),
            map,
          });
        }

        if (onSelect) {
          kakao.maps.event.addListener(map, 'click', (mouseEvent: { latLng: { getLat(): number; getLng(): number } }) => {
            const latlng = mouseEvent.latLng;
            if (pickMarkerRef.current) {
              pickMarkerRef.current.setPosition(latlng);
            } else {
              pickMarkerRef.current = new kakao.maps.Marker({ position: latlng, map });
            }
            onSelect(latlng.getLat(), latlng.getLng());
          });
        }
      })
      .catch(e => {
        console.error(e);
        if (!cancelled) setError('카카오맵을 불러오지 못했어요.');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 외부에서 pin이 바뀌면(예: GPS로 위치를 새로 찾음) 마커를 그쪽으로 옮기고 지도도 이동시킴
  useEffect(() => {
    if (!mapRef.current || !pin) return;
    const kakao = window.kakao;
    const latlng = new kakao.maps.LatLng(pin.lat, pin.lng);
    if (pickMarkerRef.current) {
      pickMarkerRef.current.setPosition(latlng);
    } else {
      pickMarkerRef.current = new kakao.maps.Marker({ position: latlng, map: mapRef.current });
    }
    mapRef.current.panTo(latlng);
  }, [pin]);

  // 검색 결과 등 추가 마커 - markers가 바뀔 때마다 지우고 새로 그림
  useEffect(() => {
    if (!mapRef.current) return;
    const kakao = window.kakao;
    const markerObjs = markers.map(m => new kakao.maps.Marker({
      position: new kakao.maps.LatLng(m.lat, m.lng),
      map: mapRef.current,
    }));
    return () => markerObjs.forEach(m => m.setMap(null));
  }, [markers]);

  if (error) return <div className={styles.error}>{error}</div>;
  return <div ref={containerRef} className={styles.map} style={{ height }} />;
}
