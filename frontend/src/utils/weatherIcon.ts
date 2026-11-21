import sun from '../assets/weather/sun.svg';
import sunCloud from '../assets/weather/sun_cloud.svg';
import cloud from '../assets/weather/cloud.svg';
import rain from '../assets/weather/rain.svg';
import snow from '../assets/weather/snow.svg';
import sunRain from '../assets/weather/sun_rain.svg';
import snowRain from '../assets/weather/snow_rain.svg';

// SKY(1=맑음,3=구름많음,4=흐림)/PTY(0=없음,1=비,2=비눈,3=눈,4=소나기)를 아이콘으로 매핑.
// pty가 0이 아니면(비/눈/소나기) sky보다 우선해서 보여줌
export function getWeatherIconUrl(sky: number | null, pty: number | null): string | null {
  if (pty === 1) return rain;
  if (pty === 2) return snowRain;
  if (pty === 3) return snow;
  if (pty === 4) return sunRain;
  if (sky === 1) return sun;
  if (sky === 3) return sunCloud;
  if (sky === 4) return cloud;
  return null;
}
