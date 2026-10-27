import { useState, useEffect, useRef } from 'react';
import { getFiles, uploadFiles, createDirectory, toggleFavorite, renameFile, downloadFile, deleteFile } from '../../api/file';
import type { FileItem, NasTypeFilter } from '../../types';
import NasThumbnail from './NasThumbnail';
import NasPreviewModal from './NasPreviewModal';
import NasContextMenu, { type ContextMenuItem } from './NasContextMenu';
import styles from './NasFileGrid.module.css';

interface Props {
  parentId: string | null;
  search: string;
  typeFilter: NasTypeFilter;
  sourceFilter?: 'UPLOAD' | 'CHATBOT' | 'EMAIL' | null;
  refreshKey: number;
  onOpenFolder: (id: string, name: string) => void;
  onChanged: () => void;
}

type SortKey = 'name' | 'updatedAt' | 'sizeBytes';

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];

function matchesTypeFilter(f: FileItem, filter: NasTypeFilter): boolean {
  if (filter === 'ALL') return true;
  if (f.isDirectory) return false;
  const mime = f.mimeType ?? '';
  const ext = (f.extension ?? '').toLowerCase();
  const isPdf = mime === 'application/pdf' || ext === 'pdf';
  const isArchive = ARCHIVE_EXTENSIONS.includes(ext);
  switch (filter) {
    case 'IMAGE': return mime.startsWith('image/');
    case 'VIDEO': return mime.startsWith('video/');
    case 'PDF': return isPdf;
    case 'ARCHIVE': return isArchive;
    case 'OTHER': return !mime.startsWith('image/') && !mime.startsWith('video/') && !isPdf && !isArchive;
  }
}

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
export default function NasFileGrid({ parentId, search, typeFilter, sourceFilter, refreshKey, onOpenFolder, onChanged }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; mode: 'file' | 'empty' } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragBaseSelection = useRef<Set<string>>(new Set());
  const dragAdditive = useRef(false);

  useEffect(() => {
    setSelected(new Set());
    const params = search.trim()
      ? { search: search.trim() }
      : sourceFilter
        ? { source: sourceFilter }
        : { parentId: parentId ?? undefined };
    getFiles(params).then(setFiles).catch(console.error);
  }, [parentId, search, sourceFilter, refreshKey]);

  const visible = [...files]
    .filter(f => matchesTypeFilter(f, typeFilter))
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'updatedAt') return b.updatedAt.localeCompare(a.updatedAt);
      return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
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
    if (f.previewable) { setPreviewFile(f); return; }
    downloadFile(f.id, f.name).catch(console.error);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    try {
      await uploadFiles(Array.from(fileList), parentId ?? undefined);
      onChanged();
    } catch (e) {
      console.error(e);
    }
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

  const fileMenuItems: ContextMenuItem[] = [
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
    <div className={styles.container}>
      <div className={styles.actionRow}>
        <button className={styles.actionBtn} onClick={handleNewFolder}>+ 새 폴더</button>
        <button className={styles.actionBtn} onClick={() => fileInputRef.current?.click()}>파일 업로드</button>
        <button className={styles.actionBtn} onClick={() => folderInputRef.current?.click()}>폴더 업로드</button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={e => { handleUpload(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          // @ts-expect-error webkitdirectory는 표준 React 타입엔 없지만 Chrome/Edge가 폴더 업로드용으로 지원하는 속성
          webkitdirectory=""
          onChange={e => { handleUpload(e.target.files); e.target.value = ''; }}
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
        <button className={`${styles.headerBtn} ${sortKey === 'name' ? styles.headerBtnActive : ''}`.trim()} onClick={() => setSortKey('name')}>이름</button>
        <button className={`${styles.headerBtn} ${sortKey === 'updatedAt' ? styles.headerBtnActive : ''}`.trim()} onClick={() => setSortKey('updatedAt')}>수정 날짜</button>
        <button className={`${styles.headerBtn} ${sortKey === 'sizeBytes' ? styles.headerBtnActive : ''}`.trim()} onClick={() => setSortKey('sizeBytes')}>파일크기</button>
      </div>

      <div className={styles.grid} onMouseDown={handleGridMouseDown}>
        {visible.length === 0 ? (
          <div className={styles.empty}>파일이 없습니다</div>
        ) : (
          visible.map(f => (
            <div
              key={f.id}
              data-nas-tile-id={f.id}
              ref={el => {
                if (el) tileRefs.current.set(f.id, el);
                else tileRefs.current.delete(f.id);
              }}
              className={`${styles.tile} ${selected.has(f.id) ? styles.tileSelected : ''}`.trim()}
              onClick={e => handleTileClick(e, f)}
              onDoubleClick={() => handleOpen(f)}
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
        <NasPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
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
