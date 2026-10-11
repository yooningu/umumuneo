import { useState } from 'react';
import NasToolbar from '../components/NasToolbar';
import NasFileGrid from '../components/NasFileGrid';
import NasSidebar from '../components/NasSidebar';
import type { NasTypeFilter } from '../types';
import styles from './NasPage.module.css';

// 나스(파일) 페이지: 위쪽 툴바(타입 필터/검색/상위폴더) + 메인 파일 그리드 + 오른쪽 즐겨찾기·용량 사이드바.
// 폴더 이동은 폴더 스택(folderStack)으로 관리해서 "상위 폴더로" 버튼이 한 단계씩 뒤로 가게 한다.
export default function NasPage() {
  const [parentId, setParentId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<NasTypeFilter>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = () => setRefreshKey(k => k + 1);

  const openFolder = (id: string, name: string) => {
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
        <div className={styles.mainPane}>
          <NasFileGrid
            parentId={parentId}
            search={search}
            typeFilter={typeFilter}
            refreshKey={refreshKey}
            onOpenFolder={openFolder}
            onChanged={bump}
          />
        </div>
        <div className={styles.sidePane}>
          <NasSidebar refreshKey={refreshKey} onOpenFolder={openFolder} />
        </div>
      </div>
    </div>
  );
}
