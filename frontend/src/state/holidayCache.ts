import { getHolidays } from '../api/holiday';
import type { Holiday } from '../types';

// 미니캘린더/주간캘린더/월간캘린더가 같은 연-월 공휴일을 각자 따로 요청하던 걸 공유하기 위한
// 캐시. "진행 중인 요청"까지 캐시해두기 때문에, 거의 동시에 여러 컴포넌트가 같은 연-월을
// 물어봐도 실제 네트워크 요청은 딱 한 번만 나가고 나머지는 그 결과를 같이 받아씀.
// 백엔드도 이미 월 단위로 캐싱돼있어서(HolidayService) 여긴 그 위에 "네트워크 왕복 자체"를
// 한 번 더 줄이는 역할만 함.
const cache = new Map<string, Promise<Holiday[]>>();

function keyOf(year: number, month: number): string {
  return `${year}-${month}`;
}

export function getHolidaysCached(year: number, month: number): Promise<Holiday[]> {
  const key = keyOf(year, month);
  let promise = cache.get(key);
  if (!promise) {
    promise = getHolidays(year, month).catch(err => {
      cache.delete(key); // 실패하면 캐시에 안 남겨서 다음에 다시 시도할 수 있게 함
      throw err;
    });
    cache.set(key, promise);
  }
  return promise;
}

// 날짜 구간이 걸치는 연-월들의 공휴일을 전부 합쳐서 Map(date -> name)으로 반환하는 헬퍼.
// 호출하는 쪽에서 매번 Promise.all + flat + Map 변환을 반복 작성하지 않도록 함
export async function getHolidayMapCached(months: { year: number; month: number }[]): Promise<Map<string, string>> {
  const unique = [...new Map(months.map(m => [keyOf(m.year, m.month), m])).values()];
  const results = await Promise.all(unique.map(m => getHolidaysCached(m.year, m.month)));
  return new Map(results.flat().map(h => [h.date, h.name]));
}
