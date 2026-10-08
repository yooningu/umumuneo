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

export const downloadMailAttachment = async (
  mailId: string,
  attachmentId: string,
  filename: string
): Promise<void> => {
  const res = await client.get(`/emails/${mailId}/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

// 이미지/영상/PDF 미리보기용 - 인증 헤더가 필요해서 <img src="..."> 로 바로 못 쓰고,
// blob으로 받아서 object URL을 만들어야 함. 사용하는 쪽에서 다 쓰고 나면 revokeObjectURL 호출 필요.
export const getMailAttachmentPreviewUrl = async (mailId: string, attachmentId: string): Promise<string> => {
  const res = await client.get(`/emails/${mailId}/attachments/${attachmentId}/view`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(res.data);
};
