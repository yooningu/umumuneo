import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyStoredThemeImmediately } from './utils/theme'

// 로그인 정보(API) 응답 전에 저장해둔 테마부터 먼저 적용 - 라이트로 잠깐 그려졌다 다크로 바뀌는 깜빡임 방지
applyStoredThemeImmediately()

createRoot(document.getElementById('root')!).render(
  <App />
)
