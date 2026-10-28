import { useState } from 'react';
import NasToolbar from '../components/nas/NasToolbar';
import NasFileGrid from '../components/nas/NasFileGrid';
import NasSidebar from '../components/nas/NasSidebar';
import type { NasTypeFilter } from '../types';
import styles from './NasPage.module.css';

type FileSource = 'UPLOAD' | 'CHATBOT' | 'EMAIL';

// 나스(파일) 페이지: 위쪽 툴바(타입 필터/검색/상위폴더) + 메인 파일 그리드 + 오른쪽 즐겨찾기·용량 사이드바.
// 폴더 이동은 폴더 스택(folderStack)으로 관리해서 "상위 폴더로" 버튼이 한 단계씩 뒤로 가게 한다.
export default function NasPage() {
  const [parentId, setParentId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NasTypeFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<FileSource | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = () => setRefreshKey(k => k + 1);

  // 사이드바에서 분류(전체/업로드/이메일/챗봇)를 고르면 그 출처로 걸러서 루트부터 다시 보여준다.
  // 폴더 구조는 그대로 유지되고(평면으로 안 쏟아짐), 그 안을 탐색하는 동안에도 필터가 계속 적용된다.
  const selectSource = (source: FileSource | null) => {
    setSourceFilter(source);
    setSearch('');
    setFolderStack([]);
    setParentId(null);
  };

  const openFolder = (id: string, name: string) => {
    // sourceFilter는 그대로 유지 - 분류를 보던 중 폴더에 들어가도 같은 분류 안에서 탐색되게
    setFolderStack(prev => [...prev, { id, name }]);
    setParentId(id);
    setSearch('');
  };

  const goUp = () => {
    setFolderStack(prev => {
      const next = prev.slice(0, -1);
      setParentId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <NasToolbar
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        search={search}
        onSearchChange={setSearch}
        canGoUp={folderStack.length > 0}
        onGoUp={goUp}
      />

      <div className={styles.body}>
        <div className={styles.sidePane}>
          <NasSidebar
            refreshKey={refreshKey}
            onOpenFolder={openFolder}
            sourceFilter={sourceFilter}
            onSelectSource={selectSource}
          />
        </div>
        <div className={styles.mainPane}>
          <NasFileGrid
            parentId={parentId}
            search={search}
            typeFilter={typeFilter}
            sourceFilter={sourceFilter}
            refreshKey={refreshKey}
            onOpenFolder={openFolder}
            onChanged={bump}
          />
        </div>
      </div>
    </div>
  );
}
