import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyStoredThemeImmediately } from './utils/theme'

// 로그인 정보(API) 응답 전에 저장해둔 테마부터 먼저 적용 - 라이트로 잠깐 그려졌다 다크로 바뀌는 깜빡임 방지
applyStoredThemeImmediately()

// 브라우저가 저장공간 부족 등을 이유로 이 사이트의 localStorage(로그인 토큰 포함)를 알아서
// 비워버리지 못하게 "영구 저장" 권한을 요청. 지원 안 하거나 거부돼도 조용히 무시됨(필수 아님).
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <App />
)
