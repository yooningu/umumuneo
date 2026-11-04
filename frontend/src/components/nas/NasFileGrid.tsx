import { useState, useEffect, useRef, type DragEvent } from 'react';
import { IoGridOutline, IoListOutline } from 'react-icons/io5';
import { FaArrowDownLong, FaStar } from 'react-icons/fa6';
import { BsDownload, BsPencil, BsTrash } from 'react-icons/bs';
import { getFiles, createDirectory, toggleFavorite, renameFile, downloadFile, deleteFile, moveFile, copyFile } from '../../api/file';
import { enqueueUpload, collectDroppedEntries, subscribeUploadDone, type DroppedEntry } from '../../state/uploadQueue';
import { getFileIcon } from '../../utils/fileIcon';
import { attachLongPress } from '../../utils/longPress';
import type { FileItem } from '../../types';
import NasThumbnail from './NasThumbnail';
import NasPreviewModal from './NasPreviewModal';
import NasContextMenu, { type ContextMenuItem } from './NasContextMenu';
import ConfirmDialog from '../common/ConfirmDialog';
import Skeleton from '../common/Skeleton';
import styles from './NasFileGrid.module.css';

// 그리드 보기에서 로딩 중에 보여줄 타일 모양 스켈레톤 (아이콘 자리만)
function NasTileSkeleton() {
  return (
    <div className={styles.tile}>
      <Skeleton width={36} height={36} borderRadius={8} />
    </div>
  );
}

interface Props {
  parentId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  sourceFilter?: 'UPLOAD' | 'CHATBOT' | 'EMAIL' | null;
  folderStack: { id: string; name: string }[];
  refreshKey: number;
  onOpenFolder: (id: string, name: string) => void;
  onNavigateRoot: () => void;
  onNavigateSource: () => void;
  onNavigateFolder: (index: number) => void;
  onChanged: () => void;
}

type SortKey = 'name' | 'updatedAt' | 'sizeBytes';
type SortDir = 'asc' | 'desc';

// 처음 클릭했을 때 자연스러운 기본 방향 (이름은 가나다순, 날짜/크기는 큰 것부터)
const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  name: 'asc',
  updatedAt: 'desc',
  sizeBytes: 'desc',
};

// 타일을 드래그해서 다른 폴더 위에 놓을 때(이동) dataTransfer에 담는 커스텀 타입 -
// OS에서 끌어온 진짜 파일 드래그와 구분하는 용도 (저건 'Files' 타입이 붙어있음)
const NAS_IDS_MIME = 'application/x-nas-ids';

// 이름 입력 인풋이 DOM에 나타나는 순간 포커스 + 전체 선택. 컴포넌트 밖에 선언해서 매 렌더마다
// 새 함수가 되지 않게 함 - 콜백 ref가 렌더마다 바뀌면 React가 그때마다 다시 호출해서(select()가
// 매 키 입력마다 다시 실행됨) 한 글자만 남고 다음 글자가 전체를 덮어쓰는 버그가 생겼었음
function focusEditInput(el: HTMLInputElement | null) {
  if (el) {
    el.focus();
    el.select();
  }
}

function formatSize(bytes?: number): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

// 나스(파일) 메인 영역: 상단 빠른 작업(새 폴더/업로드) + 정렬 헤더 + 파일/폴더 타일 그리드.
// 검색어가 있으면 전체(폴더 무관) 검색, 없으면 현재 폴더(parentId) 안의 목록을 보여줌.
export default function NasFileGrid({ parentId, search, onSearchChange, sourceFilter, folderStack, refreshKey, onOpenFolder, onNavigateRoot, onNavigateSource, onNavigateFolder, onChanged }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR.name);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; mode: 'file' | 'empty' } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false); // OS에서 파일/폴더를 끌어다 놓는 중인지
  const [dropTargetId, setDropTargetId] = useState<string | null>(null); // 타일 드래그 중 올려놓은 폴더 타일
  const [editingId, setEditingId] = useState<string | null>(null); // 이름을 바로 타이핑 중인 타일(새 폴더 생성 직후 / 이름 변경)
  const [editingValue, setEditingValue] = useState('');
  const [clipboard, setClipboard] = useState<{ ids: string[]; mode: 'copy' | 'cut' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragBaseSelection = useRef<Set<string>>(new Set());
  const dragAdditive = useRef(false);
  const fileDragCounter = useRef(0);
  // 터치 드래그 핸들러(아래쪽 useEffect, document 레벨이라 리렌더마다 새로 안 붙임)가 최신
  // selected 값을 읽을 수 있게 거울처럼 복사해둠
  const selectedRef = useRef<Set<string>>(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // 업로드 큐에서 파일 하나가 다 올라갈 때마다(큐가 순서대로 처리하는 중이라 여러 번 올 수 있음)
  // 지금 보고 있는 목록을 새로고침한다
  useEffect(() => subscribeUploadDone(onChanged), [onChanged]);

  useEffect(() => {
    setSelected(new Set());
    // 분류(sourceFilter)가 걸려있어도 폴더 구조는 그대로 유지 - 루트/폴더 안을 평소처럼
    // 탐색하되 그 출처가 아닌 항목만 안 보이게 함 (전부 평면으로 쏟아내지 않음)
    const params = search.trim()
      ? { search: search.trim() }
      : { parentId: parentId ?? undefined, source: sourceFilter ?? undefined };
    setLoading(true);
    getFiles(params).then(setFiles).catch(console.error).finally(() => setLoading(false));
  }, [parentId, search, sourceFilter, refreshKey]);

  // 같은 항목을 다시 누르면 오름차순/내림차순이 뒤집힘
  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_SORT_DIR[key]);
    }
  };

  const visible = [...files]
    .sort((a, b) => {
      let cmp: number;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
      else cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Shift+클릭 범위선택의 기준점(마지막으로 "새로" 찍은 지점) - 윈도우 탐색기처럼
  const selectionAnchorRef = useRef<string | null>(null);
  // 모바일에서 길게 눌러 메뉴를 띄운 뒤부터는, 평범한 탭도 Ctrl+클릭처럼 선택을 토글하게 함
  // (터치엔 Ctrl 키가 없어서 대신 "길게 누르기"로 다중 선택 모드에 들어가는 셈)
  const multiSelectModeRef = useRef(false);
  useEffect(() => {
    if (selected.size === 0) multiSelectModeRef.current = false;
  }, [selected]);

  // 기본은 한 개만 선택(새로 클릭하면 교체), Ctrl/Cmd+클릭이면 윈도우처럼 중첩 선택(토글),
  // Shift+클릭이면 마지막으로 선택한 지점부터 지금 클릭한 지점까지 전부 선택(윈도우 탐색기처럼)
  const handleTileClick = (e: React.MouseEvent, f: FileItem) => {
    if (e.shiftKey && selectionAnchorRef.current) {
      const ids = visible.map(x => x.id);
      const anchorIdx = ids.indexOf(selectionAnchorRef.current);
      const clickedIdx = ids.indexOf(f.id);
      if (anchorIdx !== -1 && clickedIdx !== -1) {
        const [start, end] = anchorIdx < clickedIdx ? [anchorIdx, clickedIdx] : [clickedIdx, anchorIdx];
        setSelected(new Set(ids.slice(start, end + 1)));
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      toggleSelect(f.id);
    } else {
      setSelected(new Set([f.id]));
    }
    selectionAnchorRef.current = f.id;
  };

  // 빈 공간을 탭/클릭하면 선택 해제 (모바일에서 다중 선택 모드를 빠져나가는 용도도 겸함)
  const handleGridClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-nas-tile-id]')) return;
    setSelected(new Set());
  };

  // 빈 공간에서 마우스를 누르면 드래그 선택(사각형) 시작. 타일 위에서 누른 거면
  // (타일 자체의 클릭 처리에 맡기고) 드래그 선택을 시작하지 않음.
  const handleGridMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-nas-tile-id]')) return;
    dragAdditive.current = e.ctrlKey || e.metaKey;
    dragBaseSelection.current = dragAdditive.current ? new Set(selected) : new Set();
    if (!dragAdditive.current) setSelected(new Set());
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragCurrent({ x: e.clientX, y: e.clientY });
  };

  // 드래그 중엔 document 전체에서 이동/놓기를 추적 (그리드 바깥으로 나가도 계속 따라가야 하므로)
  useEffect(() => {
    if (!dragStart) return;
    const handleMove = (e: MouseEvent) => setDragCurrent({ x: e.clientX, y: e.clientY });
    const handleUp = () => { setDragStart(null); setDragCurrent(null); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragStart]);

  // 드래그 사각형과 겹치는 타일들을 계산해서 선택 상태로 반영
  useEffect(() => {
    if (!dragStart || !dragCurrent) return;
    const rect = {
      left: Math.min(dragStart.x, dragCurrent.x),
      right: Math.max(dragStart.x, dragCurrent.x),
      top: Math.min(dragStart.y, dragCurrent.y),
      bottom: Math.max(dragStart.y, dragCurrent.y),
    };
    const ids = new Set(dragAdditive.current ? dragBaseSelection.current : []);
    tileRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      if (r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top) {
        ids.add(id);
      }
    });
    setSelected(ids);
  }, [dragStart, dragCurrent]);

  // 터치 전용 드래그 - 네이티브 HTML5 드래그(draggable)는 터치에서 거의 지원이 안 돼서
  // 따로 구현함. 빈 공간에서 시작하면 위 사각형 선택(dragStart/dragCurrent)을 그대로
  // 터치로 구동하고, 타일 위에서 시작하면 그 파일(들)을 끌어서 폴더 위에 놓는 이동으로 처리함.
  // 움직임이 작아서(MOVE_THRESHOLD 이내) 아직 선택/이동 중 뭔지 안 정해졌으면 그냥 탭으로 두고
  // (길게 누르기는 attachLongPress가, 짧은 탭은 onClick/더블탭이 알아서 처리함) 끼어들지 않음.
  useEffect(() => {
    const MOVE_THRESHOLD = 10;
    let mode: 'idle' | 'maybe' | 'select' | 'move' = 'idle';
    let origin: { x: number; y: number } | null = null;
    let moveIds: string[] = [];
    let currentDropTarget: string | null = null;

    const reset = () => {
      mode = 'idle';
      origin = null;
      moveIds = [];
      currentDropTarget = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { reset(); return; }
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      // 파일 그리드/리스트 영역 밖(헤더, 사이드바 등)에서 시작한 터치는 무시 - 마우스 버전이
      // .grid/.list 자신에게만 리스너를 다는 것과 똑같이 범위를 맞춤
      if (!target.closest('[data-nas-grid-area]')) { reset(); return; }
      const tileEl = target.closest<HTMLElement>('[data-nas-tile-id]');
      origin = { x: touch.clientX, y: touch.clientY };
      mode = 'maybe';
      if (tileEl) {
        const fileId = tileEl.dataset.nasTileId!;
        moveIds = selectedRef.current.has(fileId) ? [...selectedRef.current] : [fileId];
      } else {
        moveIds = [];
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (mode === 'idle' || !origin) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;

      if (mode === 'maybe') {
        if (Math.abs(dx) < MOVE_THRESHOLD && Math.abs(dy) < MOVE_THRESHOLD) return;
        mode = moveIds.length > 0 ? 'move' : 'select';
        if (mode === 'select') {
          dragAdditive.current = false;
          dragBaseSelection.current = new Set();
          setSelected(new Set());
          setDragStart(origin);
        }
      }

      e.preventDefault(); // 선택/이동 드래그로 확정되면 그때부터 화면 스크롤을 막음
      if (mode === 'select') {
        setDragCurrent({ x: touch.clientX, y: touch.clientY });
      } else {
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const folderEl = el?.closest<HTMLElement>('[data-nas-tile-id]');
        const folderId = folderEl?.dataset.nasTileId;
        const folder = folderId ? files.find(f => f.id === folderId) : undefined;
        const valid = folder?.isDirectory && !moveIds.includes(folder.id) ? folder.id : null;
        if (valid !== currentDropTarget) {
          currentDropTarget = valid;
          setDropTargetId(valid);
        }
      }
    };

    const onTouchEnd = async (e: TouchEvent) => {
      if (mode === 'move') {
        e.preventDefault();
        const targetId = currentDropTarget;
        setDropTargetId(null);
        if (targetId) {
          try {
            await Promise.all(moveIds.map(id => moveFile(id, targetId)));
            setSelected(new Set());
            onChanged();
          } catch (err) {
            console.error(err);
          }
        }
      } else if (mode === 'select') {
        e.preventDefault();
        setDragStart(null);
        setDragCurrent(null);
      }
      reset();
    };

    const onTouchCancel = () => reset();

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchCancel);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [files, onChanged]);

  const handleOpen = (f: FileItem) => {
    if (f.isDirectory) { onOpenFolder(f.id, f.name); return; }
    setPreviewFile(f);
  };

  // 모바일(터치)엔 더블클릭/Ctrl+클릭이 없어서:
  // - 같은 타일을 300ms 안에 두 번 터치하면 열림(더블클릭 대체)
  // - 길게 눌러서 다중 선택 모드에 들어간 뒤부턴, 평범한 탭 하나하나가 선택을 토글함(Ctrl+클릭 대체)
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const handleTileTouchEnd = (e: React.TouchEvent, f: FileItem) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === f.id && now - last.time < 300) {
      lastTapRef.current = null;
      e.preventDefault();
      handleOpen(f);
      return;
    }
    lastTapRef.current = { id: f.id, time: now };
    if (multiSelectModeRef.current) {
      e.preventDefault();
      toggleSelect(f.id);
    }
  };

  // 타일을 드래그해서 다른 폴더 타일 위에 놓으면 그 폴더로 이동시킨다.
  // 드래그한 타일이 이미 선택되어 있었으면(여러 개 선택 상태) 선택된 것 전부를 같이 옮긴다.
  const handleTileDragStart = (e: DragEvent, f: FileItem) => {
    const ids = selected.has(f.id) ? [...selected] : [f.id];
    e.dataTransfer.setData(NAS_IDS_MIME, JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragOver = (e: DragEvent, folder: FileItem) => {
    if (!e.dataTransfer.types.includes(NAS_IDS_MIME)) return; // OS 파일 드래그는 그리드 전체에서 처리하므로 여기선 무시
    e.preventDefault();
    e.stopPropagation();
    if (dropTargetId !== folder.id) setDropTargetId(folder.id);
  };

  const handleFolderDragLeave = (e: DragEvent, folder: FileItem) => {
    if (!e.dataTransfer.types.includes(NAS_IDS_MIME)) return;
    if (dropTargetId === folder.id) setDropTargetId(null);
  };

  const handleFolderDrop = async (e: DragEvent, folder: FileItem) => {
    if (!e.dataTransfer.types.includes(NAS_IDS_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
    const raw = e.dataTransfer.getData(NAS_IDS_MIME);
    if (!raw) return;
    const ids: string[] = JSON.parse(raw).filter((id: string) => id !== folder.id);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map(id => moveFile(id, folder.id)));
      setSelected(new Set());
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  // 파일 input(webkitdirectory 포함)에서 고른 파일들을 업로드 큐에 넣는다.
  // webkitRelativePath가 있으면(폴더로 고른 경우) 그 경로 그대로 폴더 구조를 유지해서 올린다.
  const handleFileListUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const entries: DroppedEntry[] = Array.from(fileList).map(file => ({
      file,
      relativePath: file.webkitRelativePath || file.name,
    }));
    enqueueUpload(entries, parentId ?? undefined).catch(console.error);
  };

  // 드래그앤드롭 - 브라우저 기본 동작(파일을 열어버림)을 막아야 드롭이 동작함
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    fileDragCounter.current++;
    setIsFileDragging(true);
  };
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    fileDragCounter.current = Math.max(0, fileDragCounter.current - 1);
    if (fileDragCounter.current === 0) setIsFileDragging(false);
  };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    fileDragCounter.current = 0;
    setIsFileDragging(false);
    collectDroppedEntries(e.dataTransfer)
      .then(entries => enqueueUpload(entries, parentId ?? undefined))
      .catch(console.error);
  };

  // 탐색기처럼: 이름을 먼저 물어보지 않고 "새 폴더"로 바로 만든 뒤, 그 자리에서 바로 이름을 타이핑하게 함
  const handleNewFolder = async () => {
    try {
      const created = await createDirectory('새 폴더', parentId ?? undefined);
      onChanged();
      setEditingId(created.id);
      setEditingValue(created.name);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await Promise.all([...selected].map(id => toggleFavorite(id)));
      setSelected(new Set());
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRename = () => {
    if (selected.size !== 1) return;
    const target = files.find(f => f.id === [...selected][0]);
    if (!target) return;
    setEditingId(target.id);
    setEditingValue(target.name);
  };

  const commitEdit = async () => {
    const id = editingId;
    const name = editingValue.trim();
    setEditingId(null);
    if (!id) return;
    const target = files.find(f => f.id === id);
    if (!target || !name || name === target.name) return;
    try {
      await renameFile(id, name);
      setSelected(new Set());
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const cancelEdit = () => setEditingId(null);

  const handleDelete = () => {
    if (selected.size === 0) return;
    setConfirmDelete(true);
  };

  const confirmDeleteSelected = async () => {
    setConfirmDelete(false);
    try {
      await Promise.all([...selected].map(id => deleteFile(id)));
      setSelected(new Set());
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadSelected = async () => {
    for (const id of selected) {
      const f = files.find(x => x.id === id);
      if (f && !f.isDirectory) await downloadFile(f.id, f.name).catch(console.error);
    }
  };

  const handleShowDetails = () => {
    if (selected.size !== 1) return;
    const target = files.find(f => f.id === [...selected][0]);
    if (!target || target.isDirectory) return;
    setPreviewFile(target);
  };

  // 잘라내기/복사/붙여넣기 - 복사는 여러 번 붙여넣을 수 있게 클립보드를 유지하고,
  // 잘라내기는 한 번 붙여넣으면(이동되면) 비움
  const handleCut = () => {
    if (selected.size === 0) return;
    setClipboard({ ids: [...selected], mode: 'cut' });
  };

  const handleCopy = () => {
    if (selected.size === 0) return;
    setClipboard({ ids: [...selected], mode: 'copy' });
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      if (clipboard.mode === 'copy') {
        await Promise.all(clipboard.ids.map(id => copyFile(id, parentId)));
      } else {
        await Promise.all(clipboard.ids.map(id => moveFile(id, parentId)));
        setClipboard(null);
      }
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  // PC에서 Ctrl/Cmd+X/C/V로도 되게 함 - 다른 입력창(검색/이름변경 등)에 포커스 있을 때는
  // 그 입력창 자체의 복사/붙여넣기를 방해하지 않도록 건너뜀
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'x' || e.key === 'X') handleCut();
      else if (e.key === 'c' || e.key === 'C') handleCopy();
      else if (e.key === 'v' || e.key === 'V') handlePaste();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selected, clipboard, parentId]);

  // 우클릭(또는 모바일에서 길게 누르기)한 지점 기준으로 메뉴를 띄움 - 타일이면 그 파일 메뉴,
  // 빈 공간이면 전체 메뉴
  const openMenuAt = (x: number, y: number, originEl: HTMLElement) => {
    const tileEl = originEl.closest<HTMLElement>('[data-nas-tile-id]');
    const fileId = tileEl?.dataset.nasTileId;
    const f = fileId ? files.find(x2 => x2.id === fileId) : undefined;
    if (f) {
      setSelected(prev => (prev.has(f.id) ? prev : new Set([f.id])));
      setContextMenu({ x, y, mode: 'file' });
    } else {
      setContextMenu({ x, y, mode: 'empty' });
    }
  };

  // 브라우저 기본 우클릭 메뉴는 막고 우리 메뉴를 띄움. .grid/타일 각각에 onContextMenu를 거는 대신
  // document 레벨에서 한 번에 가로채서, 레이아웃이 실제로 어디까지 차지하는지와 상관없이
  // 나스 페이지에 있는 동안은 화면 어디서 우클릭해도 확실히 걸리게 함.
  // 모바일(터치)에는 우클릭이 없어서, 같은 위치에 길게 누르기(long-press)도 똑같이 연결해둠.
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      openMenuAt(e.clientX, e.clientY, e.target as HTMLElement);
    };
    document.addEventListener('contextmenu', handleContextMenu);
    // 길게 누르기로 메뉴가 뜨면 그때부터 "다중 선택 모드" 시작 - 이후 평범한 탭들이 토글로 동작함
    const detachLongPress = attachLongPress(document, (x, y, el) => {
      multiSelectModeRef.current = true;
      openMenuAt(x, y, el);
    });
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      detachLongPress();
    };
  }, [files]);

  const singleSelectedFile = selected.size === 1 ? files.find(f => f.id === [...selected][0]) : undefined;

  const fileMenuItems: ContextMenuItem[] = [
    { label: '상세 정보', onClick: handleShowDetails, disabled: !singleSelectedFile || singleSelectedFile.isDirectory },
    { label: '다운로드', onClick: handleDownloadSelected },
    { label: '잘라내기', onClick: handleCut },
    { label: '복사', onClick: handleCopy },
    { label: '즐겨찾기', onClick: handleToggleFavorite },
    { label: '이름 변경', onClick: handleRename, disabled: selected.size !== 1 },
    { label: '삭제', onClick: handleDelete, danger: true },
  ];

  const emptyMenuItems: ContextMenuItem[] = [
    { label: '새 폴더 만들기', onClick: handleNewFolder },
    { label: '파일 업로드', onClick: () => fileInputRef.current?.click() },
    { label: '폴더 업로드', onClick: () => folderInputRef.current?.click() },
    { label: '붙여넣기', onClick: handlePaste, disabled: !clipboard },
  ];

  return (
    <div
      className={styles.container}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isFileDragging && (
        <div className={styles.dragOverlay}>
          <span>여기에 파일/폴더를 놓으세요</span>
        </div>
      )}
      <div className={styles.actionRow}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbItem} onClick={onNavigateRoot}>all</span>
          {sourceFilter && (
            <>
              <span className={styles.breadcrumbSep}>/</span>
              <span
                className={`${styles.breadcrumbItem} ${folderStack.length === 0 ? styles.breadcrumbCurrent : ''}`.trim()}
                onClick={onNavigateSource}
              >
                {sourceFilter.toLowerCase()}
              </span>
            </>
          )}
          {folderStack.map((f, i) => (
            <span key={f.id} className={styles.breadcrumbSegment}>
              <span className={styles.breadcrumbSep}>/</span>
              <span
                className={`${styles.breadcrumbItem} ${i === folderStack.length - 1 ? styles.breadcrumbCurrent : ''}`.trim()}
                onClick={() => onNavigateFolder(i)}
              >
                {f.name}
              </span>
            </span>
          ))}
        </div>
        {selected.size === 0 && (
          <input
            className={styles.searchInput}
            placeholder="파일 검색"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={e => { handleFileListUpload(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          // @ts-expect-error webkitdirectory는 표준 React 타입엔 없지만 Chrome/Edge가 폴더 업로드용으로 지원하는 속성
          webkitdirectory=""
          onChange={e => { handleFileListUpload(e.target.files); e.target.value = ''; }}
        />

        {selected.size > 0 && (
          <div className={styles.selectionBar}>
            <span className={styles.selectionCount}>{selected.size}개 선택됨</span>
            <button className={styles.iconBtn} onClick={handleDownloadSelected} title="다운로드"><BsDownload /></button>
            <button className={styles.iconBtn} onClick={handleToggleFavorite} title="즐겨찾기"><FaStar /></button>
            <button className={styles.iconBtn} onClick={handleRename} disabled={selected.size !== 1} title="이름 변경"><BsPencil /></button>
            <button className={styles.iconBtn} onClick={handleDelete} title="삭제"><BsTrash /></button>
          </div>
        )}
      </div>

      <div className={styles.header}>
        <button className={`${styles.headerBtn} ${sortKey === 'name' ? styles.headerBtnActive : ''}`.trim()} onClick={() => handleSortClick('name')}>
          이름
          {sortKey === 'name' && (
            <FaArrowDownLong className={`${styles.sortArrow} ${sortDir === 'asc' ? styles.sortArrowAsc : ''}`.trim()} />
          )}
        </button>
        <button className={`${styles.headerBtn} ${sortKey === 'updatedAt' ? styles.headerBtnActive : ''}`.trim()} onClick={() => handleSortClick('updatedAt')}>
          수정 날짜
          {sortKey === 'updatedAt' && (
            <FaArrowDownLong className={`${styles.sortArrow} ${sortDir === 'asc' ? styles.sortArrowAsc : ''}`.trim()} />
          )}
        </button>
        <button className={`${styles.headerBtn} ${sortKey === 'sizeBytes' ? styles.headerBtnActive : ''}`.trim()} onClick={() => handleSortClick('sizeBytes')}>
          파일크기
          {sortKey === 'sizeBytes' && (
            <FaArrowDownLong className={`${styles.sortArrow} ${sortDir === 'asc' ? styles.sortArrowAsc : ''}`.trim()} />
          )}
        </button>
        <div className={styles.viewToggle}>
          <div className={`${styles.toggleThumb} ${viewMode === 'list' ? styles.toggleThumbRight : ''}`.trim()} />
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.viewToggleBtnActive : ''}`.trim()}
            onClick={() => setViewMode('grid')}
            title="그리드 보기"
          >
            <IoGridOutline />
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.viewToggleBtnActive : ''}`.trim()}
            onClick={() => setViewMode('list')}
            title="레이아웃 보기"
          >
            <IoListOutline />
          </button>
        </div>
      </div>

      <div data-nas-grid-area className={viewMode === 'grid' ? styles.grid : styles.list} onMouseDown={handleGridMouseDown} onClick={handleGridClick}>
        {loading && viewMode === 'grid' ? (
          Array.from({ length: 12 }, (_, i) => <NasTileSkeleton key={i} />)
        ) : visible.length === 0 ? (
          <div className={styles.empty}>파일이 없습니다</div>
        ) : viewMode === 'grid' ? (
          visible.map(f => (
            <div
              key={f.id}
              data-nas-tile-id={f.id}
              ref={el => {
                if (el) tileRefs.current.set(f.id, el);
                else tileRefs.current.delete(f.id);
              }}
              className={`${styles.tile} ${selected.has(f.id) ? styles.tileSelected : ''} ${dropTargetId === f.id ? styles.tileDropTarget : ''} ${clipboard?.mode === 'cut' && clipboard.ids.includes(f.id) ? styles.tileCut : ''}`.trim()}
              onClick={e => handleTileClick(e, f)}
              onDoubleClick={() => handleOpen(f)}
              onTouchEnd={e => handleTileTouchEnd(e, f)}
              draggable
              onDragStart={e => handleTileDragStart(e, f)}
              onDragOver={f.isDirectory ? (e => handleFolderDragOver(e, f)) : undefined}
              onDragLeave={f.isDirectory ? (e => handleFolderDragLeave(e, f)) : undefined}
              onDrop={f.isDirectory ? (e => handleFolderDrop(e, f)) : undefined}
            >
              <div className={styles.tileIcon}>
                <NasThumbnail file={f} fallback={getFileIcon(f)} />
                {f.isFavorite && <span className={styles.favBadge}><FaStar /></span>}
              </div>
              {editingId === f.id ? (
                <input
                  ref={focusEditInput}
                  className={styles.tileNameInput}
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onDoubleClick={e => e.stopPropagation()}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                  }}
                />
              ) : (
                <div className={styles.tileName} title={f.name}>{f.name}</div>
              )}
            </div>
          ))
        ) : (
          visible.map(f => (
            <div
              key={f.id}
              data-nas-tile-id={f.id}
              ref={el => {
                if (el) tileRefs.current.set(f.id, el);
                else tileRefs.current.delete(f.id);
              }}
              className={`${styles.listRow} ${selected.has(f.id) ? styles.listRowSelected : ''} ${dropTargetId === f.id ? styles.listRowDropTarget : ''} ${clipboard?.mode === 'cut' && clipboard.ids.includes(f.id) ? styles.listRowCut : ''}`.trim()}
              onClick={e => handleTileClick(e, f)}
              onDoubleClick={() => handleOpen(f)}
              onTouchEnd={e => handleTileTouchEnd(e, f)}
              draggable
              onDragStart={e => handleTileDragStart(e, f)}
              onDragOver={f.isDirectory ? (e => handleFolderDragOver(e, f)) : undefined}
              onDragLeave={f.isDirectory ? (e => handleFolderDragLeave(e, f)) : undefined}
              onDrop={f.isDirectory ? (e => handleFolderDrop(e, f)) : undefined}
            >
              <span className={styles.listIcon}>
                {getFileIcon(f)}
                {f.isFavorite && <span className={styles.favBadge}><FaStar /></span>}
              </span>
              {editingId === f.id ? (
                <input
                  ref={focusEditInput}
                  className={styles.listNameInput}
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onDoubleClick={e => e.stopPropagation()}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                    else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                  }}
                />
              ) : (
                <span className={styles.listName} title={f.name}>{f.name}</span>
              )}
              <span className={styles.listMeta}>{f.isDirectory ? '-' : formatSize(f.sizeBytes)}</span>
              <span className={styles.listMeta}>{f.updatedAt.slice(0, 10)}</span>
            </div>
          ))
        )}
      </div>

      {dragStart && dragCurrent && (
        <div
          className={styles.selectionBox}
          style={{
            position: 'fixed',
            left: Math.min(dragStart.x, dragCurrent.x),
            top: Math.min(dragStart.y, dragCurrent.y),
            width: Math.abs(dragCurrent.x - dragStart.x),
            height: Math.abs(dragCurrent.y - dragStart.y),
          }}
        />
      )}

      {previewFile && (
        <NasPreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDeleted={() => { setPreviewFile(null); onChanged(); }}
          onSaved={onChanged}
        />
      )}

      {contextMenu && (
        <NasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.mode === 'file' ? fileMenuItems : emptyMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`${selected.size}개 항목을 삭제할까요?`}
          danger
          onConfirm={confirmDeleteSelected}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
