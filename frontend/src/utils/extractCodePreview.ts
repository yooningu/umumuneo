// 챗봇 메시지 안의 ```html/```css/```js 코드블록을 찾아서 미리보기용으로 뽑아내는 유틸.
// 메시지 하나 안에 같은 언어 블록이 여러 개 있으면 나온 순서 그대로 이어 붙임
// (CSS는 뒤에 올수록 우선순위가 높고, JS는 순서대로 실행되니까 자연스럽게 맞음)
// (g 플래그 붙은 정규식은 lastIndex 상태를 들고 있어서, 호출마다 새로 만들어 써야 안전함)
const blockRe = () => /```(html|css|js|javascript)\n([\s\S]*?)```/gi;

export interface CodePreviewData {
  html: string;
  css: string;
  js: string;
}

export function extractCodePreview(markdown: string): CodePreviewData | null {
  const htmlParts: string[] = [];
  const cssParts: string[] = [];
  const jsParts: string[] = [];

  for (const match of markdown.matchAll(blockRe())) {
    const lang = match[1].toLowerCase();
    const code = match[2];
    if (lang === 'html') htmlParts.push(code);
    else if (lang === 'css') cssParts.push(code);
    else jsParts.push(code); // js, javascript
  }

  if (htmlParts.length === 0) return null;
  return {
    html: htmlParts.join('\n'),
    css: cssParts.join('\n'),
    js: jsParts.join('\n')
  };
}

// 미리보기로 따로 보여줄 html/css/js 블록은 마크다운 본문에서 지워서 중복 표시를 막음
// (그 외 언어의 코드블록, 예: json/bash 등은 그대로 남겨둠)
export function stripPreviewBlocks(markdown: string): string {
  return markdown.replace(blockRe(), '').trim();
}
