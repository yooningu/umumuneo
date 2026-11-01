import styles from './ConfirmDialog.module.css';

interface Props {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // true면 확인 버튼을 삭제류 강조색(빨강)으로
  onConfirm: () => void;
  onCancel: () => void;
}

// window.confirm() 대신 쓰는 커스텀 확인 모달. window.confirm()은 결과를 바로 bool로 돌려주지만
// 이건 모달이라 비동기라서, 쓰는 쪽에서 "확인 대기 중" 상태(예: 지울 대상 id)를 들고 있다가
// onConfirm에서 실제 동작을 실행하고, onCancel(또는 onConfirm 끝)에서 그 상태를 지워주면 됨.
export default function ConfirmDialog({ message, confirmLabel = '확인', cancelLabel = '취소', danger, onConfirm, onCancel }: Props) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.card} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>{cancelLabel}</button>
          <button
            className={danger ? styles.confirmBtnDanger : styles.confirmBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
