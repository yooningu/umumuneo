import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { kakaoLogin } from '../../api/auth';
import styles from './CallbackPage.module.css';

export default function CallbackPage() {
  const navigate = useNavigate();
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) {
      navigate('/login');
      return;
    }

    // LoginPage에서 체크박스 상태를 sessionStorage에 저장해뒀던 걸 읽음. talk_message 미동의 때
    // 동의 페이지를 거쳐 콜백이 한 번 더 올 수도 있어서(같은 로그인 시도의 연장), 여기서 지우지 않음
    const rememberMe = sessionStorage.getItem('kakaoRememberMe') === '1';

    kakaoLogin(code, rememberMe)
      .then(({ accessToken, talkMessageAgreed, agreementUrl }) => {
        console.log('로그인 응답:', { talkMessageAgreed, agreementUrl });
        localStorage.setItem('accessToken', accessToken);
        if (!talkMessageAgreed && agreementUrl) {
          console.log('talk_message 미동의 상태 -> 추가 동의 페이지로 이동:', agreementUrl);
          window.location.href = agreementUrl;
        } else {
          console.log('모든 필요 동의 완료 -> 홈으로 이동');
          navigate('/');
        }
      })
      .catch((err) => {
        console.log('로그인 에러:', err);
        navigate('/login');
      });
  }, [navigate]);

  return <div className={styles.container}>로그인 중...</div>;
}
