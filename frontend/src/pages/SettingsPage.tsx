import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, updateMe, deleteMe, getLocation, setLocationByAddress, setLocationByGps } from '../api/user';
import { getSessions, revokeSession, revokeAllSessions } from '../api/auth';
import { getBlockedSenders, unblockSender } from '../api/mail';
import { applyTheme, type Theme } from '../utils/theme';
import { reverseGeocodeKakao } from '../utils/kakaoMapLoader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import type { User, SessionInfo, BlockedSender, LocationInfo } from '../types';
import styles from './SettingsPage.module.css';

function formatRelative(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

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
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [blockedSenders, setBlockedSenders] = useState<BlockedSender[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  // GPS로 고른 정확한 좌표 - 있으면 "저장" 시 이 좌표로 저장(문자열 역변환 없이 정확하게),
  // 주소 입력란을 직접 수정하면 비워져서 그때부턴 입력한 주소 문자열 기준으로 저장됨
  const [pickedLatLng, setPickedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getMe()
      .then(u => {
        setUser(u);
        setTheme(u.theme);
      })
      .catch(console.error);
    getSessions().then(setSessions).catch(console.error);
    getBlockedSenders().then(setBlockedSenders).catch(console.error);
    getLocation().then(setLocation).catch(console.error);
  }, []);

  // 주소 입력란을 직접 고치면, GPS로 집어뒀던 정확한 좌표는 더 이상 유효하지 않으니 비움
  const handleAddressInputChange = (value: string) => {
    setAddressInput(value);
    if (pickedLatLng) setPickedLatLng(null);
  };

  const handleUseGps = () => {
    if (locatingGps) return;
    if (!navigator.geolocation) {
      setAddressError('이 브라우저는 위치 정보를 지원하지 않아요.');
      return;
    }
    setLocatingGps(true);
    setAddressError(null);
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        setPickedLatLng({ lat: latitude, lng: longitude });
        try {
          // 좌표를 행정동 이름으로 미리보기(저장 전 입력란 표시용, 백엔드 호출 없이 카카오로 바로 처리)
          const regionName = await reverseGeocodeKakao(latitude, longitude);
          setAddressInput(regionName ?? '현재 위치');
        } catch (e) {
          console.error(e);
          // 이름을 못 가져왔어도 좌표 자체는 유효하니, 저장은 여전히 가능하게 둠
          setAddressInput('현재 위치');
        } finally {
          setLocatingGps(false);
        }
      },
      error => {
        // code 1=권한거부, 2=위치못찾음, 3=시간초과 - timeout 안 걸면 이 콜백 자체가 영원히 안 불릴 수 있어서 명시함
        setAddressError(
          error.code === error.PERMISSION_DENIED
            ? '위치 권한이 거부됐어요. 브라우저/OS 설정에서 이 사이트의 위치 권한을 허용해주세요.'
            : '위치를 가져오지 못했어요. 잠시 후 다시 시도해주세요.'
        );
        setLocatingGps(false);
      },
      { timeout: 10000 }
    );
  };

  // 저장은 이 버튼을 눌렀을 때만 실제로 반영됨 - pickedLatLng가 있으면(GPS로 고른 직후,
  // 입력란을 그 뒤에 직접 고치지 않았으면) 정확한 좌표로, 없으면 입력란의 주소 문자열로 저장
  const handleSave = async () => {
    if (!addressInput.trim() || savingAddress) return;
    setSavingAddress(true);
    setAddressError(null);
    try {
      const updated = pickedLatLng
        ? await setLocationByGps(pickedLatLng.lat, pickedLatLng.lng)
        : await setLocationByAddress(addressInput.trim());
      setLocation(updated);
      setAddressInput('');
      setPickedLatLng(null);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddressError(message || '위치를 저장하지 못했어요. 다시 확인해주세요.');
    } finally {
      setSavingAddress(false);
    }
  };


  const handleUnblock = async (blocked: BlockedSender) => {
    setUnblockingId(blocked.id);
    try {
      await unblockSender(blocked.id);
      setBlockedSenders(prev => prev.filter(b => b.id !== blocked.id));
    } catch (e) {
      console.error(e);
    } finally {
      setUnblockingId(null);
    }
  };

  const goToLogin = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const handleRevokeSession = async (session: SessionInfo) => {
    setRevokingId(session.id);
    try {
      await revokeSession(session.id);
      if (session.isCurrent) {
        goToLogin();
        return;
      }
      setSessions(prev => prev.filter(s => s.id !== session.id));
    } catch (e) {
      console.error(e);
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAllConfirm = async () => {
    setLoggingOutAll(true);
    try {
      await revokeAllSessions();
      goToLogin();
    } catch (e) {
      console.error(e);
      setLoggingOutAll(false);
    }
  };

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    updateMe({ theme: next }).catch(console.error);
  };

  const activeIndex = Math.max(0, THEME_OPTIONS.findIndex(o => o.value === theme));

  const handleDeleteConfirm = () => {
    setDeleting(true);
    deleteMe()
      .then(goToLogin)
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
          <div className={styles.sectionTitle}>위치</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>현재 설정된 위치</span>
            <span className={styles.rowValue}>{location?.adminDong ?? '아직 설정 안 함'}</span>
          </div>
          <div className={styles.locationInputRow}>
            <input
              className={styles.locationInput}
              value={addressInput}
              onChange={e => handleAddressInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="도로명 주소 입력 (예: 서울특별시 중구 세종대로 110)"
            />
            <button
              className={styles.secondaryBtn}
              onClick={handleSave}
              disabled={!addressInput.trim() || savingAddress}
            >
              {savingAddress ? '저장 중...' : '저장'}
            </button>
          </div>
          {addressError && <div className={styles.locationError}>{addressError}</div>}
          <div className={styles.orDivider}>또는</div>
          <button className={styles.secondaryBtn} onClick={handleUseGps} disabled={locatingGps}>
            {locatingGps ? '위치 가져오는 중...' : 'GPS로 내 위치 찾기'}
          </button>
          <div className={styles.locationHint}>
            위치를 고르면 입력란에 표시만 되고, "저장" 버튼을 눌러야 실제로 저장돼요.
            날씨 예보와 버스 정류장 검색에 이 위치가 기준으로 쓰여요.
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>로그인된 기기</div>
          {sessions.length === 0 ? (
            <div className={styles.rowValue}>불러오는 중...</div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className={styles.sessionRow}>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionLabel}>
                    {session.deviceLabel ?? '알 수 없는 기기'}
                    {session.isCurrent && <span className={styles.sessionCurrentBadge}>이 기기</span>}
                  </span>
                  <span className={styles.sessionMeta}>
                    마지막 활동 {formatRelative(session.lastUsedAt)}
                    {(session.country || session.city) &&
                      ` · ${[session.country, session.city].filter(Boolean).join(' ')}`}
                    {session.rememberMe && ' · 로그인 상태 유지'}
                  </span>
                </div>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => handleRevokeSession(session)}
                  disabled={revokingId === session.id}
                >
                  로그아웃
                </button>
              </div>
            ))
          )}
          {sessions.length > 1 && (
            <button
              className={`${styles.dangerBtn} ${styles.logoutAllBtn}`}
              onClick={() => setConfirmLogoutAll(true)}
            >
              모든 기기에서 로그아웃
            </button>
          )}
        </div>

        {blockedSenders.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>차단한 보낸사람</div>
            {blockedSenders.map(blocked => (
              <div key={blocked.id} className={styles.sessionRow}>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionLabel}>{blocked.address}</span>
                </div>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => handleUnblock(blocked)}
                  disabled={unblockingId === blocked.id}
                >
                  차단 해제
                </button>
              </div>
            ))}
          </div>
        )}

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

      {confirmLogoutAll && (
        <ConfirmDialog
          message="모든 기기에서 로그아웃할까요? 이 기기도 다시 로그인해야 해요."
          danger
          confirmLabel={loggingOutAll ? '처리 중...' : '로그아웃'}
          onConfirm={handleLogoutAllConfirm}
          onCancel={() => setConfirmLogoutAll(false)}
        />
      )}

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
