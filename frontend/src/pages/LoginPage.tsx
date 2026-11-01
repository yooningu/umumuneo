import { useState } from 'react';
import LoginBackground from './LoginBackground';
import styles from './LoginPage.module.css';

const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${import.meta.env.VITE_KAKAO_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_KAKAO_REDIRECT_URI}&response_type=code&prompt=consent`;

export default function LoginPage() {
  const [rememberMe, setRememberMe] = useState(true);

  // 카카오 로그인 페이지로 완전히 이동(redirect)하기 전에 체크 여부를 저장해둠 -
  // 돌아왔을 때(CallbackPage)는 이 페이지가 이미 사라진 뒤라 state로는 못 넘기고
  // sessionStorage를 거쳐서 전달함
  const handleLoginClick = () => {
    sessionStorage.setItem('kakaoRememberMe', rememberMe ? '1' : '0');
  };

  return (
    <div className={styles.container}>
      <LoginBackground />
      <div className={styles.loginBox}>
        <a href={KAKAO_AUTH_URL} className={styles.link} onClick={handleLoginClick}>
          <button className={styles.button}>카카오로 로그인</button>
        </a>
        <label className={styles.rememberRow}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
          />
          로그인 상태 유지
        </label>
      </div>
    </div>
  );
}
