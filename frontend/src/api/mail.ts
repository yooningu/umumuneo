import client from './client';
import type { MailItem, MailDetail, Page } from '../types';

export const getMails = async (params: { page: number; size: number; search?: string }): Promise<Page<MailItem>> => {
  const res = await client.get('/emails', { params });
  return res.data;
};

export const getMailDetail = async (id: string): Promise<MailDetail> => {
  const res = await client.get(`/emails/${id}`);
  return res.data;
};

export const deleteMail = async (id: string): Promise<void> => {
  await client.delete(`/emails/${id}`);
};

// 메일 첨부파일은 이제 실제로 NAS 파일(FileEntity)이라서 다운로드/미리보기는
// api/file.ts의 downloadFile/getPreviewBlobUrl을 attachment.id로 그대로 쓰면 된다
// (예전엔 /emails/{mailId}/attachments/{attachmentId}/... 전용 엔드포인트가 따로 있었음).
