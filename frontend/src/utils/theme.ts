import type { User } from '../types';

export type Theme = User['theme'];

const STORAGE_KEY = 'theme';

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'DARK') return true;
  if (theme === 'LIGHT') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let currentTheme: Theme = 'SYSTEM';
let mediaListenerAttached = false;

// <html data-theme="light|dark">를 직접 설정 - index.css의 :root[data-theme="dark"]가 이걸 보고 색을 뒤집음
export function applyTheme(theme: Theme) {
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.dataset.theme = resolveIsDark(theme) ? 'dark' : 'light';

  if (!mediaListenerAttached) {
    mediaListenerAttached = true;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentTheme === 'SYSTEM') {
        document.documentElement.dataset.theme = resolveIsDark('SYSTEM') ? 'dark' : 'light';
      }
    });
  }
}

// 로그인 유저 정보(API)가 오기 전에, 마지막으로 저장해둔 테마를 먼저 적용해서 화면이 깜빡이지 않게 함
export function applyStoredThemeImmediately() {
  const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'SYSTEM';
  applyTheme(stored);
}
