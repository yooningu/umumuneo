import { useSyncExternalStore } from 'react';
import { subscribeUploadQueue, getUploadTasks } from '../../state/uploadQueue';
import styles from './UploadProgressWidget.module.css';

// 어느 페이지에 있든 떠있는 업로드 진행 위젯 (App.tsx에 한 번만 마운트). 업로드 자체는
// 모듈 스코프 상태(state/uploadQueue.ts)로 관리되니, NAS 페이지를 벗어나도 업로드가 끊기지 않고
// 여기서 계속 진행 상황을 보여준다.
export default function UploadProgressWidget() {
  const tasks = useSyncExternalStore(subscribeUploadQueue, getUploadTasks);

  if (tasks.length === 0) return null;

  const pendingCount = tasks.filter(t => t.status === 'uploading' || t.status === 'queued').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {pendingCount > 0 ? `파일 업로드 중 (${pendingCount})` : '업로드 완료'}
      </div>
      <div className={styles.list}>
        {tasks.map(t => (
          <div key={t.id} className={styles.item}>
            <div className={styles.itemTop}>
              <span className={styles.itemName} title={t.name}>{t.name}</span>
              <span className={styles.itemStatus}>
                {t.status === 'error' ? '실패'
                  : t.status === 'done' ? '완료'
                  : t.status === 'queued' ? '대기 중'
                  : `${t.progress}%`}
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${t.status === 'error' ? styles.fillError : ''} ${t.status === 'done' ? styles.fillDone : ''}`}
                style={{ width: `${t.status === 'error' ? 100 : t.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
