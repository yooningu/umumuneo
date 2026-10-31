import type { ReactNode } from 'react';
import {
  BsFolder,
  BsFolder2Open,
  BsFileEarmarkImage,
  BsFileEarmarkPlay,
  BsFileEarmarkMusic,
  BsFileEarmarkPdf,
  BsFileEarmarkWord,
  BsFileEarmarkExcel,
  BsFileEarmarkPpt,
  BsFileEarmarkZip,
  BsFileEarmarkCode,
  BsFileEarmarkText,
  BsFileEarmark,
} from 'react-icons/bs';
import type { FileItem } from '../types';

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];
const WORD_EXTENSIONS = ['doc', 'docx'];
const EXCEL_EXTENSIONS = ['xls', 'xlsx', 'csv'];
const PPT_EXTENSIONS = ['ppt', 'pptx'];
const CODE_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'java', 'py', 'c', 'cpp', 'json', 'html', 'css', 'xml', 'sh', 'yml', 'yaml'];
const TEXT_EXTENSIONS = ['txt', 'md'];

// 파일 종류별 아이콘(react-icons/bs). 그리드/리스트/미리보기/파일 선택 모달에서 공통으로 사용.
export function getFileIcon(f: FileItem): ReactNode {
  if (f.isDirectory) return f.hasChildren ? <BsFolder2Open /> : <BsFolder />;
  const mime = f.mimeType ?? '';
  const ext = (f.extension ?? '').toLowerCase();
  if (mime.startsWith('image/')) return <BsFileEarmarkImage />;
  if (mime.startsWith('video/')) return <BsFileEarmarkPlay />;
  if (mime.startsWith('audio/')) return <BsFileEarmarkMusic />;
  if (mime === 'application/pdf' || ext === 'pdf') return <BsFileEarmarkPdf />;
  if (ARCHIVE_EXTENSIONS.includes(ext)) return <BsFileEarmarkZip />;
  if (WORD_EXTENSIONS.includes(ext)) return <BsFileEarmarkWord />;
  if (EXCEL_EXTENSIONS.includes(ext)) return <BsFileEarmarkExcel />;
  if (PPT_EXTENSIONS.includes(ext)) return <BsFileEarmarkPpt />;
  if (CODE_EXTENSIONS.includes(ext)) return <BsFileEarmarkCode />;
  if (TEXT_EXTENSIONS.includes(ext)) return <BsFileEarmarkText />;
  return <BsFileEarmark />;
}
