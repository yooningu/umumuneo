import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  // svgr(): "파일.svg?react"로 불러오면 <img src=...>가 아니라 리액트 컴포넌트로 쓸 수 있게 해줌
  plugins: [react(), svgr()],
  server: {
    // 기본값(localhost)만 열면 같은 docker 네트워크의 다른 컨테이너(cloudflared)에서 접근이 안 됨.
    host: true,
    // Windows 호스트 + Docker 바인드 마운트에서는 기본 파일 감시(fs.watch)가
    // 변경 이벤트를 못 받는 경우가 있어 폴링 방식으로 강제한다.
    watch: {
      usePolling: true,
      interval: 300,
    },
    // Vite 개발 서버는 기본적으로 모르는 Host 헤더를 차단한다.
    // Cloudflare Tunnel(및 컨테이너 내부 헬스체크)에서 다양한 Host로 접근하므로 체크 자체를 끔.
    // (외부에 완전히 노출되는 것도 아니고, 앞단이 Cloudflare + JWT 인증이라 실질적 위험은 낮음)
    allowedHosts: true,
  },
})
