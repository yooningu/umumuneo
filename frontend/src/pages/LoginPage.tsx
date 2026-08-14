import styles from './LoginPage.module.css';

const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${import.meta.env.VITE_KAKAO_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_KAKAO_REDIRECT_URI}&response_type=code&prompt=consent`;

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <a href={KAKAO_AUTH_URL} className={styles.link}>
        <button className={styles.button}>카카오로 로그인</button>
      </a>
    </div>
  );
}
