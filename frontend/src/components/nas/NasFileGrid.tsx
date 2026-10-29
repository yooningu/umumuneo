import { useState, useEffect, useRef, type DragEvent } from 'react';
import { IoGridOutline, IoListOutline } from 'react-icons/io5';
import { FaArrowDownLong } from 'react-icons/fa6';
import { getFiles, createDirectory, toggleFavorite, renameFile, downloadFile, deleteFile, moveFile } from '../../api/file';
import { enqueueUpload, collectDroppedEntries, subscribeUploadDone, type DroppedEntry } from '../../state/uploadQueue';
import type { FileItem } from '../../types';
import NasThumbnail from './NasThumbnail';
import NasPreviewModal from './NasPreviewModal';
import NasContextMenu, { type ContextMenuItem } from './NasContextMenu';
import styles from './NasFileGrid.module.css';

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

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];

// 타일을 드래그해서 다른 폴더 위에 놓을 때(이동) dataTransfer에 담는 커스텀 타입 -
// OS에서 끌어온 진짜 파일 드래그와 구분하는 용도 (저건 'Files' 타입이 붙어있음)
const NAS_IDS_MIME = 'application/x-nas-ids';

function fileIcon(f: FileItem): string {
  if (f.isDirectory) return '📁';
  const mime = f.mimeType ?? '';
  const ext = (f.extension ?? '').toLowerCase();
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime === 'application/pdf' || ext === 'pdf') return '📕';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return '🗜️';
  return '📄';
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR.name);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; mode: 'file' | 'empty' } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false); // OS에서 파일/폴더를 끌어다 놓는 중인지
  const [dropTargetId, setDropTargetId] = useState<string | null>(null); // 타일 드래그 중 올려놓은 폴더 타일
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragBaseSelection = useRef<Set<string>>(new Set());
  const dragAdditive = useRef(false);
  const fileDragCounter = useRef(0);

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
    getFiles(params).then(setFiles).catch(console.error);
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

  // 기본은 한 개만 선택(새로 클릭하면 교체), Ctrl/Cmd+클릭이면 윈도우처럼 중첩 선택(토글)
  const handleTileClick = (e: React.MouseEvent, f: FileItem) => {
    if (e.ctrlKey || e.metaKey) toggleSelect(f.id);
    else setSelected(new Set([f.id]));
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

  const handleOpen = (f: FileItem) => {
    if (f.isDirectory) { onOpenFolder(f.id, f.name); return; }
    setPreviewFile(f);
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

  const handleNewFolder = async () => {
    const name = window.prompt('폴더 이름을 입력하세요');
    if (!name?.trim()) return;
    try {
      await createDirectory(name.trim(), parentId ?? undefined);
      onChanged();
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

  const handleRename = async () => {
    if (selected.size !== 1) return;
    const target = files.find(f => f.id === [...selected][0]);
    if (!target) return;
    const name = window.prompt('새 이름을 입력하세요', target.name);
    if (!name?.trim() || name === target.name) return;
    try {
      await renameFile(target.id, name.trim());
      setSelected(new Set());
      onChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size}개 항목을 삭제할까요?`)) return;
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

  // 브라우저 기본 우클릭 메뉴는 막고 우리 메뉴를 띄움. .grid/타일 각각에 onContextMenu를 거는 대신
  // document 레벨에서 한 번에 가로채서, 레이아웃이 실제로 어디까지 차지하는지와 상관없이
  // 나스 페이지에 있는 동안은 화면 어디서 우클릭해도 확실히 걸리게 함.
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const tileEl = target.closest<HTMLElement>('[data-nas-tile-id]');
      const fileId = tileEl?.dataset.nasTileId;
      const f = fileId ? files.find(x => x.id === fileId) : undefined;
      if (f) {
        setSelected(prev => (prev.has(f.id) ? prev : new Set([f.id])));
        setContextMenu({ x: e.clientX, y: e.clientY, mode: 'file' });
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, mode: 'empty' });
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [files]);

  const singleSelectedFile = selected.size === 1 ? files.find(f => f.id === [...selected][0]) : undefined;

  const fileMenuItems: ContextMenuItem[] = [
    { label: '상세 정보', onClick: handleShowDetails, disabled: !singleSelectedFile || singleSelectedFile.isDirectory },
    { label: '다운로드', onClick: handleDownloadSelected },
    { label: '즐겨찾기', onClick: handleToggleFavorite },
    { label: '이름 변경', onClick: handleRename, disabled: selected.size !== 1 },
    { label: '삭제', onClick: handleDelete, danger: true },
  ];

  const emptyMenuItems: ContextMenuItem[] = [
    { label: '새 폴더 만들기', onClick: handleNewFolder },
    { label: '파일 업로드', onClick: () => fileInputRef.current?.click() },
    { label: '폴더 업로드', onClick: () => folderInputRef.current?.click() },
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
        <input
          className={styles.searchInput}
          placeholder="파일 검색"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
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
            <button className={styles.iconBtn} onClick={handleDownloadSelected} title="다운로드">⬇</button>
            <button className={styles.iconBtn} onClick={handleToggleFavorite} title="즐겨찾기">★</button>
            <button className={styles.iconBtn} onClick={handleRename} disabled={selected.size !== 1} title="이름 변경">✎</button>
            <button className={styles.iconBtn} onClick={handleDelete} title="삭제">🗑</button>
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

      <div className={viewMode === 'grid' ? styles.grid : styles.list} onMouseDown={handleGridMouseDown}>
        {visible.length === 0 ? (
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
              className={`${styles.tile} ${selected.has(f.id) ? styles.tileSelected : ''} ${dropTargetId === f.id ? styles.tileDropTarget : ''}`.trim()}
              onClick={e => handleTileClick(e, f)}
              onDoubleClick={() => handleOpen(f)}
              draggable
              onDragStart={e => handleTileDragStart(e, f)}
              onDragOver={f.isDirectory ? (e => handleFolderDragOver(e, f)) : undefined}
              onDragLeave={f.isDirectory ? (e => handleFolderDragLeave(e, f)) : undefined}
              onDrop={f.isDirectory ? (e => handleFolderDrop(e, f)) : undefined}
            >
              <div className={styles.tileIcon}>
                <NasThumbnail file={f} fallback={fileIcon(f)} />
                {f.isFavorite && <span className={styles.favBadge}>★</span>}
              </div>
              <div className={styles.tileName} title={f.name}>{f.name}</div>
              {!f.isDirectory && (
                <div className={styles.tileMeta}>{formatSize(f.sizeBytes)} · {f.updatedAt.slice(0, 10)}</div>
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
              className={`${styles.listRow} ${selected.has(f.id) ? styles.listRowSelected : ''} ${dropTargetId === f.id ? styles.listRowDropTarget : ''}`.trim()}
              onClick={e => handleTileClick(e, f)}
              onDoubleClick={() => handleOpen(f)}
              draggable
              onDragStart={e => handleTileDragStart(e, f)}
              onDragOver={f.isDirectory ? (e => handleFolderDragOver(e, f)) : undefined}
              onDragLeave={f.isDirectory ? (e => handleFolderDragLeave(e, f)) : undefined}
              onDrop={f.isDirectory ? (e => handleFolderDrop(e, f)) : undefined}
            >
              <span className={styles.listIcon}>
                {fileIcon(f)}
                {f.isFavorite && <span className={styles.favBadge}>★</span>}
              </span>
              <span className={styles.listName} title={f.name}>{f.name}</span>
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
    </div>
  );
}
