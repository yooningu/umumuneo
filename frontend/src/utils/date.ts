// Date -> 'YYYY-MM-DD' (로컬 타임존 기준)
// Date.toISOString()은 UTC로 변환해서 자정~오전 9시(KST) 사이엔 하루 밀리는 문제가 있어 사용하지 않는다.
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
