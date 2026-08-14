import { useState, useRef, useEffect, type DragEvent } from 'react';
import { sendMessage } from '../api/chat';
import { uploadFiles } from '../api/file';
import { transcribeAudio } from '../api/stt';
import styles from './ChatWidget.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onScheduleChange?: () => void;
}

// 이미지 파일을 캔버스에 다시 그려서 PNG base64로 변환한다.
// webp/gif/bmp 등은 Ollama vision 모델이 못 읽는 경우가 있어(400 에러) 항상 PNG로 통일해서 보낸다.
// (브라우저는 <img>/canvas로 대부분의 이미지 포맷을 디코딩할 수 있으므로 이 방식이 가장 안전함)
function imageFileToPngBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error('이미지를 변환할 수 없어요.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러올 수 없어요.'));
    };
    img.src = url;
  });
}

// 파일을 순수 base64 문자열로 읽는다 (data URI 접두사 제외)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatWidget({ onScheduleChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secretMode, setSecretMode] = useState(false); // 켜져있으면 대화가 DB에 저장 안 되고 서버 메모리에만 잠깐 남음
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isWhisperRecording, setIsWhisperRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceRafRef = useRef<number | null>(null);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 메시지가 추가되거나(스트리밍 중 매 청크마다) 항상 맨 아래를 보도록 스크롤
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    setPendingFiles(prev => [...prev, ...Array.from(files)]);
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 시크릿 모드 켜기/끄기. 켜고 끌 때마다 항상 "새 대화"로 취급해서 화면과 세션을 초기화한다
  // (꺼져있던 시크릿 대화로 다시 이어지지 않게 - 매번 새로 시작하는 걸 원함)
  const toggleSecretMode = () => {
    setSecretMode(prev => !prev);
    setMessages([]);
    setSessionId(null);
  };

  // 드래그 앤 드롭 (자식 엘리먼트 진입/이탈 시에도 이벤트가 겹쳐 발생하므로 카운터로 관리)
  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    dragCounter.current++;
    setIsDragging(true);
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // 무음 자동 감지 파라미터
  const SILENCE_THRESHOLD = 0.015; // 이 볼륨(RMS, 0~1) 밑이면 "조용함"으로 판단
  const SILENCE_DURATION_MS = 1500; // 말을 하다가 이만큼 계속 조용하면 자동 종료
  const MAX_RECORD_MS = 30000; // 침묵 감지가 안 될 경우를 대비한 안전장치(최대 녹음 시간)

  const stopSilenceWatch = () => {
    if (silenceRafRef.current !== null) cancelAnimationFrame(silenceRafRef.current);
    silenceRafRef.current = null;
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    maxDurationTimerRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  };

  // 마이크 볼륨을 계속 분석하다가, 말을 시작한 뒤 일정 시간 이상 조용해지면 자동으로 녹음을 끝낸다
  // (다른 챗봇 앱들처럼 버튼을 다시 안 눌러도 알아서 멈추게)
  const watchSilence = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    let hasSpoken = false;
    let silenceStart: number | null = null;

    const check = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);

      if (rms > SILENCE_THRESHOLD) {
        hasSpoken = true;
        silenceStart = null;
      } else if (hasSpoken) {
        if (silenceStart === null) {
          silenceStart = performance.now();
        } else if (performance.now() - silenceStart > SILENCE_DURATION_MS) {
          mediaRecorderRef.current?.stop();
          return;
        }
      }
      silenceRafRef.current = requestAnimationFrame(check);
    };
    silenceRafRef.current = requestAnimationFrame(check);

    // 말을 계속 하거나 마이크 입력이 감지 안 되는 등 예외 상황을 대비한 최대 녹음 시간
    maxDurationTimerRef.current = setTimeout(() => {
      mediaRecorderRef.current?.stop();
    }, MAX_RECORD_MS);
  };

  // 음성 입력 (로컬 Whisper STT, 언어 자동 감지, 말이 끝나면 자동 종료)
  const toggleWhisperVoice = async () => {
    if (isWhisperRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('이 브라우저는 마이크 녹음을 지원하지 않아요.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stopSilenceWatch();
        stream.getTracks().forEach(t => t.stop());
        setIsWhisperRecording(false);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const text = await transcribeAudio(blob);
          if (text) setInput(prev => (prev ? `${prev} ${text}` : text));
        } catch (e) {
          console.error(e);
          alert('음성 인식에 실패했어요.');
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      watchSilence(stream);
      setIsWhisperRecording(true);
    } catch (e) {
      console.error(e);
      alert('마이크 권한이 필요해요.');
    }
  };

  const send = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || loading || uploading) return;
    const filesToSend = pendingFiles;
    const hadAttachment = filesToSend.length > 0;
    const imageFiles = filesToSend.filter(f => f.type.startsWith('image/'));
    const audioFiles = filesToSend.filter(f => f.type.startsWith('audio/'));
    const otherFiles = filesToSend.filter(f => !imageFiles.includes(f) && !audioFiles.includes(f));
    let content = input.trim();
    setInput('');
    setPendingFiles([]);

    let images: string[] = [];
    let audio: string[] = [];
    let sendableFiles: { name: string; fileId: string; isImage: boolean }[] = [];

    if (filesToSend.length > 0) {
      setUploading(true);
      try {
        // NAS에 원본 저장 + 이미지는 base64로 vision 모델에 전달.
        // 음성 파일은 여기서 변환하지 않고 base64 그대로 보내서 백엔드가 STT까지 처리하게 한다.
        const [uploaded, base64Images, base64Audio] = await Promise.all([
          uploadFiles(filesToSend),
          Promise.all(imageFiles.map(imageFileToPngBase64)),
          Promise.all(audioFiles.map(fileToBase64)),
        ]);
        images = base64Images;
        audio = base64Audio;

        // 이미지/기타 파일은 NAS에 업로드된 파일 ID를 같이 보내서, "나에게 보내기" 때 공개 링크로 전달할 수 있게 함
        const idByName = new Map(uploaded.map(f => [f.name, f.id]));
        sendableFiles = [...imageFiles, ...otherFiles]
          .map(f => ({ name: f.name, fileId: idByName.get(f.name) ?? '', isImage: imageFiles.includes(f) }))
          .filter(f => f.fileId);

        // 화면/대화 기록에는 파일명만 남기고(실제 내용/이미지는 안 보이게), 내가 입력한 프롬프트만 그대로 유지
        // (이미지도 빠뜨리지 않고 표시 - 예전엔 이미지 첨부하면 보낸 뒤 기록에 아무 흔적도 안 남았음)
        const attachedText = [...imageFiles, ...otherFiles, ...audioFiles].map(f => `📎 ${f.name}`).join('\n');
        content = [content, attachedText].filter(Boolean).join('\n\n');
      } catch (e) {
        console.error(e);
      } finally {
        setUploading(false);
      }
    }
    if (!content) return;

    setMessages(prev => [...prev, { role: 'user', content }, { role: 'assistant', content: '' }]);
    setLoading(true);

    let aiContent = '';

    sendMessage(
      content,
      sessionId,
      'gemma4:e4b',
      (chunk) => {
        aiContent += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: aiContent };
          return next;
        });
      },
      (newSessionId) => {
        setSessionId(newSessionId);
        setLoading(false);
        onScheduleChange?.();
      },
      (err) => {
        console.error(err);
        setLoading(false);
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: `⚠️ ${err}` };
          return next;
        });
      },
      images.length > 0 ? images : undefined,
      hadAttachment,
      audio.length > 0 ? audio : undefined,
      sendableFiles.length > 0 ? sendableFiles : undefined,
      secretMode,
    );
  };

  return (
    <div
      className={styles.container}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 드래그 중 오버레이 */}
      {isDragging && (
        <div className={styles.dragOverlay}>
          <span>드래그로 파일 넣기</span>
        </div>
      )}

      {/* 시크릿 모드 안내 - 켜져있는 동안은 대화가 DB에 저장되지 않고 서버 메모리에만 잠깐 남는다 */}
      {secretMode && (
        <div className={styles.statusRow}>
          <span>🕶️ 시크릿 모드 - 이 대화는 저장되지 않아요</span>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            {secretMode ? '시크릿 대화를 시작해보세요' : '일정을 추가하거나 질문해보세요'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`${styles.messageRow} ${m.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant}`}>
            <span className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
              {m.content || (loading && i === messages.length - 1 ? '...' : '')}
            </span>
          </div>
        ))}
      </div>

      {/* 첨부 예정 파일 목록 */}
      {pendingFiles.length > 0 && (
        <div className={styles.attachRow}>
          {pendingFiles.map((f, i) => (
            <div key={i} className={styles.attachChip}>
              <span className={styles.attachName}>{f.name}</span>
              <button className={styles.attachRemove} onClick={() => removeFile(i)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* 음성 인식 중 상태 표시 (STT 변환에 시간이 걸려서 그동안 뭐가 진행 중인지 알려줌) */}
      {transcribing && (
        <div className={styles.statusRow}>
          <span className={styles.statusDot} />
          <span>음성을 텍스트로 변환하는 중...</span>
        </div>
      )}

      {/* 입력창 */}
      <div className={styles.inputRow}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <button className={styles.iconButton} onClick={() => fileInputRef.current?.click()} title="파일 첨부">
          +
        </button>
        <button
          className={`${styles.iconButton} ${secretMode ? styles.iconButtonActive : ''}`}
          onClick={toggleSecretMode}
          title="시크릿 모드 (대화를 저장하지 않음)"
        >
          🕶️
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="메시지 입력..."
          className={styles.input}
        />
        <button
          className={`${styles.iconButton} ${isWhisperRecording ? styles.iconButtonActive : ''}`}
          onClick={toggleWhisperVoice}
          disabled={transcribing}
          title="음성 입력 (로컬 Whisper STT, 언어 자동 감지)"
        >
          {transcribing ? '⏳' : '🎤'}
        </button>
        <button onClick={send} disabled={loading || uploading} className={styles.sendButton}>
          ›
        </button>
      </div>
    </div>
  );
}
