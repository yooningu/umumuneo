import client from './client';
import type { MailItem, MailDetail } from '../types';

export const getMails = async (): Promise<MailItem[]> => {
  const res = await client.get('/emails');
  return res.data;
};

export const getMailDetail = async (id: string): Promise<MailDetail> => {
  const res = await client.get(`/emails/${id}`);
  return res.data;
};

// 메일 첨부파일은 이제 실제로 NAS 파일(FileEntity)이라서 다운로드/미리보기는
// api/file.ts의 downloadFile/getPreviewBlobUrl을 attachment.id로 그대로 쓰면 된다
// (예전엔 /emails/{mailId}/attachments/{attachmentId}/... 전용 엔드포인트가 따로 있었음).
