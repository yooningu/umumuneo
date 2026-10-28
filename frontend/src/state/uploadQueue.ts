import {
  uploadFiles,
  createDirectory,
  initChunkedUpload,
  uploadChunk,
  getUploadedChunks,
  completeChunkedUpload,
  cancelChunkedUpload,
} from '../api/file';

// Cloudflare가 프록시 요청 본문을 100MB로 제한해서, 그보다 큰 파일은 한 번에 못 올림.
// 이 크기를 넘으면 조각내서 나눠 보낸다 (여유 있게 80MB를 기준으로, 20MB씩 쪼갬).
const CHUNK_THRESHOLD = 80 * 1024 * 1024;
const CHUNK_SIZE = 20 * 1024 * 1024;

export interface UploadTask {
  id: string;
  name: string;
  progress: number; // 0~100
  status: 'queued' | 'uploading' | 'paused' | 'done' | 'error' | 'canceled';
}

export interface DroppedEntry {
  file: File;
  // 폴더 없이 파일 하나면 그냥 파일명, 폴더에서 왔으면 "폴더/하위폴더/파일명" 형태
  relativePath: string;
}

type Listener = () => void;

// 모듈 스코프에 상태를 둬서(React 컴포넌트 밖) 어느 페이지로 이동해도 유지되게 한다.
// App.tsx에 항상 떠있는 UploadProgressWidget이 useSyncExternalStore로 이 상태를 구독함.
let tasks: UploadTask[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(l => l());
}

export function subscribeUploadQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getUploadTasks(): UploadTask[] {
  return tasks;
}

function upsertTask(task: UploadTask) {
  const idx = tasks.findIndex(t => t.id === task.id);
  tasks = idx === -1 ? [...tasks, task] : tasks.map((t, i) => (i === idx ? task : t));
  emit();
}

// 완료/실패/취소 항목은 잠깐 보여준 뒤 목록에서 자동으로 지운다
function scheduleCleanup(id: string, delay = 3000) {
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    emit();
  }, delay);
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `upload-${Date.now()}-${counter}`;
}

// 완료 알림 - NasFileGrid 등이 구독해서 "파일 하나 다 올라갔으니 목록 새로고침해라"에 씀.
// enqueueUpload 호출 자체는 큐에 넣기만 하고 바로 끝나버리니(실제 업로드는 나중에 순서대로 진행),
// "언제 끝났는지"는 이 쪽에서 따로 알려줘야 함.
const doneListeners = new Set<Listener>();
export function subscribeUploadDone(listener: Listener): () => void {
  doneListeners.add(listener);
  return () => { doneListeners.delete(listener); };
}
function notifyDone() {
  doneListeners.forEach(l => l());
}

interface Job {
  id: string;
  file: File;
  parentId: string | undefined;
  controller: AbortController | null; // 실제로 전송 중일 때만 값이 있음
  paused: boolean;
  canceled: boolean;
  // CHUNK_THRESHOLD보다 큰 파일만 사용 - 조각 업로드 진행 상태 (일시정지 후 재개해도 이미 보낸
  // 조각은 다시 안 보내는, 진짜 이어받기가 가능한 유일한 경우)
  chunked?: {
    sessionId: string;
    totalChunks: number;
    uploadedChunks: Set<number>;
  };
}

// 실제 업로드는 여기 FIFO 큐에 쌓아두고 한 번에 하나씩만 처리한다. 업로드 도중에 또 다른 파일을
// 올려도(버튼을 또 누르거나 드래그앤드롭을 또 하거나) 기존 걸 밀어내거나 같이 뒤섞이지 않고,
// 먼저 넣은 것부터 순서대로 끝까지 진행된다.
const jobQueue: Job[] = [];
const jobsById = new Map<string, Job>();
let isProcessing = false;

function enqueueJob(job: Job) {
  jobsById.set(job.id, job);
  jobQueue.push(job);
  upsertTask({ id: job.id, name: job.file.name, progress: 0, status: 'queued' });
  void processQueue();
}

// 큰 파일(CHUNK_THRESHOLD 초과)을 20MB씩 쪼개서 순서대로 올린다. 이미 올라간 조각이 있으면
// (재개하는 경우) 건너뛰어서 처음부터 다시 보내지 않는다 - 바이트 단위까지는 아니지만 조각
// 단위로는 진짜 이어받기가 된다.
async function uploadChunked(job: Job): Promise<void> {
  const totalChunks = Math.ceil(job.file.size / CHUNK_SIZE);

  if (!job.chunked) {
    const sessionId = await initChunkedUpload({
      filename: job.file.name,
      totalSize: job.file.size,
      totalChunks,
      contentType: job.file.type || undefined,
      parentId: job.parentId,
      source: 'UPLOAD',
    });
    job.chunked = { sessionId, totalChunks, uploadedChunks: new Set() };
  } else {
    // 재개하는 경우 - 서버 기준으로 이미 저장된 조각을 다시 확인한다(여러 기기/탭에서도 안전)
    const already = await getUploadedChunks(job.chunked.sessionId);
    job.chunked.uploadedChunks = new Set(already);
  }

  const { sessionId, uploadedChunks } = job.chunked;

  for (let i = 0; i < totalChunks; i++) {
    if (uploadedChunks.has(i)) continue;
    if (job.paused || job.canceled) throw new Error('upload interrupted');

    job.controller = new AbortController();
    const start = i * CHUNK_SIZE;
    const chunk = job.file.slice(start, start + CHUNK_SIZE);
    await uploadChunk(sessionId, i, chunk, job.controller.signal);
    uploadedChunks.add(i);
    upsertTask({
      id: job.id,
      name: job.file.name,
      progress: Math.round((uploadedChunks.size / totalChunks) * 100),
      status: 'uploading',
    });
  }

  await completeChunkedUpload(sessionId);
  job.chunked = undefined;
}

function chunkedProgress(job: Job): number {
  if (!job.chunked) return 0;
  return Math.round((job.chunked.uploadedChunks.size / job.chunked.totalChunks) * 100);
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (jobQueue.length > 0) {
    const job = jobQueue.shift()!;
    // 대기 중일 때 취소/일시정지됐으면 실제로 업로드를 시작하지 않고 건너뜀
    if (job.canceled) continue;
    if (job.paused) continue;

    upsertTask({ id: job.id, name: job.file.name, progress: chunkedProgress(job), status: 'uploading' });
    try {
      if (job.file.size > CHUNK_THRESHOLD) {
        await uploadChunked(job);
      } else {
        job.controller = new AbortController();
        await uploadFiles([job.file], job.parentId, 'UPLOAD', (percent) => {
          upsertTask({ id: job.id, name: job.file.name, progress: percent, status: 'uploading' });
        }, job.controller.signal);
      }
      upsertTask({ id: job.id, name: job.file.name, progress: 100, status: 'done' });
      jobsById.delete(job.id);
      notifyDone();
      scheduleCleanup(job.id);
    } catch (e) {
      if (job.canceled) {
        if (job.chunked) cancelChunkedUpload(job.chunked.sessionId).catch(() => {});
        upsertTask({ id: job.id, name: job.file.name, progress: 0, status: 'canceled' });
        jobsById.delete(job.id);
        scheduleCleanup(job.id, 1500);
      } else if (job.paused) {
        // 조각 업로드 중이었으면 이미 보낸 조각은 서버에 그대로 남아있어서, 재개 시 그만큼은 건너뜀.
        // 조각 업로드가 아니었으면(작은 파일) 재개할 때 처음부터 다시 올라감.
        upsertTask({ id: job.id, name: job.file.name, progress: chunkedProgress(job), status: 'paused' });
      } else {
        console.error(e);
        if (job.chunked) cancelChunkedUpload(job.chunked.sessionId).catch(() => {});
        upsertTask({ id: job.id, name: job.file.name, progress: 0, status: 'error' });
        jobsById.delete(job.id);
        scheduleCleanup(job.id);
      }
    } finally {
      job.controller = null;
    }
  }
  isProcessing = false;
}

// 취소 - 대기 중이었으면 큐에서 그냥 빠지고, 전송 중이었으면 요청을 중단시킨다.
// 둘 다 서버에는 아무것도 안 남는다(끊긴 업로드는 저장 안 됨).
export function cancelUpload(id: string) {
  const job = jobsById.get(id);
  if (!job) return;
  job.canceled = true;
  if (job.controller) {
    job.controller.abort();
  } else {
    // 아직 네트워크 요청 자체가 시작 안 된 상태(큐 대기 중, 또는 일시정지 상태) - 바로 취소 처리.
    // 조각 업로드를 하다가 일시정지해둔 상태였다면 서버에 남아있는 조각들도 같이 정리한다.
    if (job.chunked) cancelChunkedUpload(job.chunked.sessionId).catch(() => {});
    upsertTask({ id, name: job.file.name, progress: 0, status: 'canceled' });
    jobsById.delete(id);
    scheduleCleanup(id, 1500);
  }
}

// 일시정지 - 대기 중인 파일은 그냥 줄에서 빠져서 다른 파일이 먼저 올라가게 하고,
// 이미 전송 중인 파일은 그 요청을 중단한다(바이트 단위로 이어받는 게 아니라, 재개하면 처음부터 다시 올라감).
export function pauseUpload(id: string) {
  const job = jobsById.get(id);
  if (!job) return;
  job.paused = true;
  if (job.controller) {
    job.controller.abort();
  } else {
    upsertTask({ id, name: job.file.name, progress: chunkedProgress(job), status: 'paused' });
  }
}

// 재개 - 큐 맨 뒤에 다시 넣는다
export function resumeUpload(id: string) {
  const job = jobsById.get(id);
  if (!job || !job.paused) return;
  job.paused = false;
  jobQueue.push(job);
  upsertTask({ id, name: job.file.name, progress: chunkedProgress(job), status: 'queued' });
  void processQueue();
}

// 파일/폴더 목록을 큐에 넣는다. relativePath에 "/"가 있으면(폴더에서 왔으면) 실제로 같은 구조의
// 폴더를 서버에 먼저 만들고 그 안에 파일을 넣어서, 올린 폴더 모양이 NAS에서도 그대로 유지되게 한다.
// 폴더 없이 파일만 섞여 있어도(relativePath에 "/"가 없으면) 그냥 parentId에 바로 올라간다.
// 반환되는 Promise는 "큐에 다 넣었다"는 뜻이지 "업로드가 다 끝났다"는 뜻이 아님 - 완료 시점은
// subscribeUploadDone으로 따로 받아야 함.
export async function enqueueUpload(entries: DroppedEntry[], parentId: string | undefined): Promise<void> {
  const dirIdByPath = new Map<string, string | undefined>([['', parentId]]);

  const getOrCreateDir = async (path: string): Promise<string | undefined> => {
    if (dirIdByPath.has(path)) return dirIdByPath.get(path);
    const segments = path.split('/');
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join('/');
    const parentDirId = await getOrCreateDir(parentPath);
    const created = await createDirectory(name, parentDirId);
    dirIdByPath.set(path, created.id);
    return created.id;
  };

  // 폴더 생성은 순서/중복 방지를 위해 순차로 처리한 뒤, 파일 하나하나를 큐에 넣는다
  for (const { file, relativePath } of entries) {
    const segments = relativePath.split('/');
    segments.pop(); // 파일명 제거
    const dirPath = segments.join('/');
    const targetParentId = dirPath ? await getOrCreateDir(dirPath) : parentId;
    enqueueJob({ id: nextId(), file, parentId: targetParentId, controller: null, paused: false, canceled: false });
  }
}

// 드래그앤드롭으로 들어온 DataTransfer에서 파일(+폴더 구조) 목록을 뽑아낸다.
// 폴더 째로 드롭한 경우 webkitGetAsEntry()로 하위 항목을 재귀적으로 전부 순회한다.
export async function collectDroppedEntries(dataTransfer: DataTransfer): Promise<DroppedEntry[]> {
  const items = Array.from(dataTransfer.items);
  const out: DroppedEntry[] = [];

  const readFile = (entry: FileSystemFileEntry): Promise<File> =>
    new Promise((resolve, reject) => entry.file(resolve, reject));

  const readDirEntries = (reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  const walk = async (entry: FileSystemEntry, basePath: string): Promise<void> => {
    if (entry.isFile) {
      const file = await readFile(entry as FileSystemFileEntry);
      out.push({ file, relativePath: basePath + entry.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries는 한 번에 전부 안 줄 수 있어서 빈 배열이 올 때까지 반복 호출해야 함
      let batch: FileSystemEntry[];
      do {
        batch = await readDirEntries(reader);
        for (const child of batch) {
          await walk(child, `${basePath}${entry.name}/`);
        }
      } while (batch.length > 0);
    }
  };

  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      await walk(entry, '');
    } else {
      const file = item.getAsFile();
      if (file) out.push({ file, relativePath: file.name });
    }
  }
  return out;
}
