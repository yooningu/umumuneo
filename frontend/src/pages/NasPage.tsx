import { useState } from 'react';
import NasFileGrid from '../components/nas/NasFileGrid';
import NasSidebar from '../components/nas/NasSidebar';
import styles from './NasPage.module.css';

type FileSource = 'UPLOAD' | 'CHATBOT' | 'EMAIL';

// 나스(파일) 페이지: 메인 파일 그리드(경로/검색) + 오른쪽 즐겨찾기·용량 사이드바.
// 폴더 이동은 폴더 스택(folderStack)으로 관리해서 경로(breadcrumb) 클릭으로 원하는 단계로 바로 이동한다.
export default function NasPage() {
  const [parentId, setParentId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
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
    setFolderStack(prev => {
      // 검색 결과(폴더 깊이 무관하게 평면으로 보여줌)에서 폴더를 열면, 검색 전에 있던 경로에
      // 이미 그 폴더가 들어있을 수 있음 - 중복 key가 생기지 않도록 그 지점으로 되돌아가는 것으로 취급
      const existingIndex = prev.findIndex(f => f.id === id);
      if (existingIndex !== -1) return prev.slice(0, existingIndex + 1);
      return [...prev, { id, name }];
    });
    setParentId(id);
    setSearch('');
  };

  // 경로(breadcrumb)에서 중간 폴더를 클릭하면 그 폴더까지만 남기고 그 자리로 이동
  const goToFolderIndex = (index: number) => {
    setFolderStack(prev => {
      const next = prev.slice(0, index + 1);
      setParentId(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
    setSearch('');
  };

  return (
    <div className={styles.container}>
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
            onSearchChange={setSearch}
            sourceFilter={sourceFilter}
            folderStack={folderStack}
            refreshKey={refreshKey}
            onOpenFolder={openFolder}
            onNavigateRoot={() => selectSource(null)}
            onNavigateSource={() => selectSource(sourceFilter)}
            onNavigateFolder={goToFolderIndex}
            onChanged={bump}
          />
        </div>
      </div>
    </div>
  );
}
