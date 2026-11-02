// Date -> 'YYYY-MM-DD' (로컬 타임존 기준)
// Date.toISOString()은 UTC로 변환해서 자정~오전 9시(KST) 사이엔 하루 밀리는 문제가 있어 사용하지 않는다.
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 'YYYY-MM-DD' -> Date (로컬 타임존 기준)
export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 달력 한 달치 칸(앞뒤 빈칸 포함) 계산 - 월요일 시작(월~일), DatePickerPopover 계열에서 공통으로 씀
export function buildMonthCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
}

// "1월 20일" 형식 - 날짜 선택 트리거 버튼류에서 공통으로 씀
export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}월 ${d}일`;
}
