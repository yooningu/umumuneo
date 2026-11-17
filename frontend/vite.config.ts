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
    // 폰(Expo 웹뷰 등)에서 LAN IP로 이 개발서버에 접속할 때, 브라우저 입장에서 API 호출이
    // cross-origin이 되는 걸 막으려고 운영 백엔드로 프록시함 - 서버 간 전달이라 CORS 자체가
    // 적용 안 되고(브라우저가 보는 요청 주소는 항상 이 개발서버 자신), 백엔드 CORS 설정을
    // 건드리거나 배포할 필요가 없음. frontend/.env의 VITE_API_BASE_URL을 이 프록시 경로(/api)로
    // 바꿔서 쓰면 됨 (.env는 gitignore 대상이라 로컬에서만 바꿔도 안전함)
    proxy: {
      '/api': {
        target: 'https://api.umumuneo.com',
        changeOrigin: true,
      },
    },
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
  // vite preview(프로덕션 빌드 결과물을 서빙하는 명령)는 server와 설정을 공유하지 않고 따로 읽음 -
  // 위와 똑같은 이유로 host/allowedHosts를 여기도 똑같이 열어줘야 배포 환경(Cloudflare Tunnel)에서 접근됨
  preview: {
    host: true,
    allowedHosts: true,
  },
})
