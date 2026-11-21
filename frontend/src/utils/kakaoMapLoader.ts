// 카카오맵 JS SDK를 한 번만 로드해서 재사용 (여러 컴포넌트가 동시에 써도 스크립트 태그가 중복 삽입되지 않게)
let loadPromise: Promise<void> | null = null;

export function loadKakaoMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // maps.services까지 있어야 완전히 로드된 것으로 침 - 예전에(libraries=services 없이)
    // 이미 한 번 로드된 상태로 남아있으면 maps는 있어도 services가 비어서 다시 받아와야 함
    if (window.kakao?.maps?.services) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    // libraries=services - 좌표<->주소 변환(Geocoder) 같은 지도 외 부가기능 포함
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_JS_KEY}&autoload=false&libraries=services`;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => {
      loadPromise = null; // 실패하면 다음에 다시 시도할 수 있게 캐시를 비워둠
      reject(new Error('카카오맵 SDK 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// 좌표 -> 행정동 이름 문자열 (카카오 Geocoder, 백엔드 호출 없이 브라우저에서 바로 처리).
// 저장 전 입력란에 보여주기만 하는 용도라 여기서 실패해도 null만 반환(저장 자체는 좌표로 그대로 가능)
export async function reverseGeocodeKakao(lat: number, lng: number): Promise<string | null> {
  await loadKakaoMaps();
  const kakao = window.kakao;
  return new Promise(resolve => {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
      if (status !== kakao.maps.services.Status.OK) {
        resolve(null);
        return;
      }
      // region_type 'H' = 행정동 기준(우리 서버의 adminDong 개념과 동일), 없으면 첫 결과로 대체
      const region = result.find(r => r.region_type === 'H') ?? result[0];
      resolve(region ? region.address_name : null);
    });
  });
}
