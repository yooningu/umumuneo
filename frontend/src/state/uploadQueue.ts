import { uploadFiles, createDirectory } from '../api/file';

export interface UploadTask {
  id: string;
  name: string;
  progress: number; // 0~100
  status: 'queued' | 'uploading' | 'done' | 'error';
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

// 완료/실패 항목은 잠깐 보여준 뒤 목록에서 자동으로 지운다
function scheduleCleanup(id: string) {
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    emit();
  }, 3000);
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
}

// 실제 업로드는 여기 FIFO 큐에 쌓아두고 한 번에 하나씩만 처리한다. 업로드 도중에 또 다른 파일을
// 올려도(버튼을 또 누르거나 드래그앤드롭을 또 하거나) 기존 걸 밀어내거나 같이 뒤섞이지 않고,
// 먼저 넣은 것부터 순서대로 끝까지 진행된다.
const jobQueue: Job[] = [];
let isProcessing = false;

function enqueueJob(job: Job) {
  jobQueue.push(job);
  upsertTask({ id: job.id, name: job.file.name, progress: 0, status: 'queued' });
  void processQueue();
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  while (jobQueue.length > 0) {
    const job = jobQueue.shift()!;
    upsertTask({ id: job.id, name: job.file.name, progress: 0, status: 'uploading' });
    try {
      await uploadFiles([job.file], job.parentId, 'UPLOAD', (percent) => {
        upsertTask({ id: job.id, name: job.file.name, progress: percent, status: 'uploading' });
      });
      upsertTask({ id: job.id, name: job.file.name, progress: 100, status: 'done' });
      notifyDone();
    } catch (e) {
      console.error(e);
      upsertTask({ id: job.id, name: job.file.name, progress: 0, status: 'error' });
    } finally {
      scheduleCleanup(job.id);
    }
  }
  isProcessing = false;
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
    enqueueJob({ id: nextId(), file, parentId: targetParentId });
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
