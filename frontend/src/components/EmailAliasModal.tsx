import { useState } from 'react';
import { updateMe } from '../api/user';
import { emailAliasSchema } from '../validation/emailAlias';
import styles from './EmailAliasModal.module.css';

interface Props {
  onDone: (alias: string) => void;
}

// 최초 로그인 시, 개인 메일 별칭(umumuneo.com 주소)을 직접 정하게 하는 모달.
// 별칭을 정하기 전까지는 닫을 수 없게(강제) 만들어서 항상 값이 채워지도록 함.
export default function EmailAliasModal({ onDone }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parsed = emailAliasSchema.safeParse(value);
  const formatError = value && !parsed.success ? parsed.error.issues[0].message : null;

  const handleSubmit = async () => {
    if (!parsed.success || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateMe({ emailAlias: parsed.data });
      onDone(parsed.data);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || '이미 사용 중이거나 사용할 수 없는 별칭이에요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.title}>내 메일 주소 만들기</div>
        <div className={styles.description}>
          umumuneo.com으로 받을 나만의 메일 주소를 정해주세요.
          영소문자와 숫자만 사용할 수 있어요 (3~20자).
        </div>
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="abc123"
            autoFocus
          />
          <span className={styles.suffix}>@umumuneo.com</span>
        </div>
        {formatError && <div className={styles.error}>{formatError}</div>}
        {error && <div className={styles.error}>{error}</div>}
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!parsed.success || submitting}
        >
          {submitting ? '설정 중...' : '이 주소로 정하기'}
        </button>
      </div>
    </div>
  );
}
