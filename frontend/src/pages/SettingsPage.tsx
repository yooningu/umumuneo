import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, updateMe, deleteMe } from '../api/user';
import { applyTheme, type Theme } from '../utils/theme';
import type { User } from '../types';
import styles from './SettingsPage.module.css';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'LIGHT', label: '라이트' },
  { value: 'DARK', label: '다크' },
  { value: 'SYSTEM', label: '시스템' },
];

// 설정 페이지: 프로필 정보(읽기전용) + 화면 테마. 테마는 누르자마자 바로 적용되고 서버에도 저장됨
export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('SYSTEM');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getMe()
      .then(u => {
        setUser(u);
        setTheme(u.theme);
      })
      .catch(console.error);
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    updateMe({ theme: next }).catch(console.error);
  };

  const activeIndex = Math.max(0, THEME_OPTIONS.findIndex(o => o.value === theme));

  const handleDeleteConfirm = () => {
    setDeleting(true);
    deleteMe()
      .then(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/login');
      })
      .catch(err => {
        console.error(err);
        setDeleting(false);
      });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>프로필</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>닉네임</span>
            <span className={styles.rowValue}>{user?.nickname ?? '-'}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>umumuneo 메일 주소</span>
            <span className={styles.rowValue}>
              {user?.emailAlias ? `${user.emailAlias}@umumuneo.com` : '아직 설정 안 함'}
            </span>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>화면</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>테마</span>
            <div className={styles.themeToggle}>
              <div
                className={styles.themeThumb}
                style={{ transform: `translateX(${activeIndex * 100}%)` }}
              />
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.themeBtn} ${theme === opt.value ? styles.themeBtnActive : ''}`.trim()}
                  onClick={() => changeTheme(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>계정</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>회원탈퇴</span>
            <button className={styles.dangerBtn} onClick={() => setConfirmOpen(true)}>
              회원탈퇴
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className={styles.overlay} onClick={() => !deleting && setConfirmOpen(false)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>정말 탈퇴할까요?</div>
            <p className={styles.confirmDesc}>
              탈퇴하면 바로 로그아웃되고 다시 로그인할 수 없어요. 일정·파일·메모 등 모든 데이터는
              30일간 보관되고, 그 안에 umumuneo 담당자에게 연락하면 복구할 수 있어요.
              30일이 지나면 전부 영구적으로 삭제돼요.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.secondaryBtn} onClick={() => setConfirmOpen(false)} disabled={deleting}>
                취소
              </button>
              <button className={styles.dangerBtn} onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
