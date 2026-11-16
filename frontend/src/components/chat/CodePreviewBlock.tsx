import { useMemo, useState } from 'react';
import { LuCopy } from 'react-icons/lu';
import type { CodePreviewData } from '../../utils/extractCodePreview';
import styles from './CodePreviewBlock.module.css';

// html 문서 형태(<html>...</html>)면 그 안의 </head>/</body> 앞에 css/js를 끼워 넣고,
// 조각(fragment)만 왔으면 최소한의 문서로 감싸서 iframe에 넣을 수 있게 함
function buildSrcDoc({ html, css, js }: CodePreviewData): string {
  const styleTag = css ? `<style>${css}</style>` : '';
  const scriptTag = js ? `<script>${js}<\/script>` : '';

  if (/<html[\s>]/i.test(html)) {
    let out = html;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${styleTag}</head>`) : out.replace(/<html[^>]*>/i, m => `${m}<head>${styleTag}</head>`);
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${scriptTag}</body>`) : out.replace(/<\/html>/i, `${scriptTag}</html>`);
    return out;
  }
  return `<!doctype html><html><head>${styleTag}</head><body>${html}${scriptTag}</body></html>`;
}

export default function CodePreviewBlock({ html, css, js }: CodePreviewData) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [activeLang, setActiveLang] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const srcDoc = useMemo(() => buildSrcDoc({ html, css, js }), [html, css, js]);
  const sections = [
    { label: 'HTML', code: html },
    { label: 'CSS', code: css },
    { label: 'JS', code: js }
  ].filter(s => s.code);
  const active = sections.find(s => s.label === activeLang) ?? sections[0];
  const fullCode = sections.map(s => s.code).join('\n\n');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 조용히 무시
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === 'preview' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('preview')}
        >
          미리보기
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'code' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('code')}
        >
          코드
        </button>
      </div>

      {tab === 'preview' ? (
        <iframe
          className={styles.frame}
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          title="코드 미리보기"
        />
      ) : (
        <>
          <div className={styles.codeToolbar}>
            {/* html/css/js 파일 전환용 탭 - 메모장 탭과 같은 스타일이되, 닫을 필요가 없는
                고정된 "파일"들이라 X(닫기) 버튼은 뺌 */}
            <div className={styles.langTabs}>
              {sections.length > 1 && sections.map(s => (
                <button
                  key={s.label}
                  className={`${styles.langTab} ${active?.label === s.label ? styles.langTabActive : ''}`}
                  onClick={() => setActiveLang(s.label)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button className={styles.copyBtn} onClick={copyAll} title={copied ? '복사됨' : '전체 복사'}>
              <LuCopy /> {copied ? '복사됨' : '전체 복사'}
            </button>
          </div>
          <pre className={styles.code}><code>{active?.code ?? ''}</code></pre>
        </>
      )}
    </div>
  );
}
