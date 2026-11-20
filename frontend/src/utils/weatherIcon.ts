// SKY(1=맑음,3=구름많음,4=흐림)/PTY(0=없음,1=비,2=비눈,3=눈,4=소나기)를 아이콘 URL로 매핑.
// pty가 0이 아니면(비/눈/소나기) sky보다 우선해서 보여줌
const METEOCONS_BASE = 'https://cdn.meteocons.com/3.0.0-next.10/svg/fill';

const PTY_ICON: Record<number, string> = {
  1: `${METEOCONS_BASE}/rain.svg`,
  2: `${METEOCONS_BASE}/sleet.svg`,
  3: `${METEOCONS_BASE}/snow.svg`,
  4: `${METEOCONS_BASE}/mostly-clear-day-drizzle.svg`,
};

const SKY_ICON: Record<number, string> = {
  1: `${METEOCONS_BASE}/clear-day.svg`,
  3: `${METEOCONS_BASE}/cloudy.svg`,
  4: `${METEOCONS_BASE}/overcast.svg`,
};

export function getWeatherIconUrl(sky: number | null, pty: number | null): string | null {
  if (pty && PTY_ICON[pty]) return PTY_ICON[pty];
  if (sky && SKY_ICON[sky]) return SKY_ICON[sky];
  return null;
}
