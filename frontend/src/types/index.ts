export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  talkMessageAgreed: boolean;
  agreementUrl: string | null;
}
export interface User {
  id: string;
  nickname: string;
  email: string | null;
  emailAlias: string | null; // umumuneo.com 개인 메일 별칭 (예: "abc123" -> abc123@umumuneo.com). 아직 안 정했으면 null
  notifOffsetMin: number;
  notifEnabled: boolean;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
}
export type ScheduleType = 'TIMED' | 'MOMENT' | 'ALLDAY' | 'PERIOD';
export interface NotificationInfo {
  id: string;
  offsetMin: number;
  notifyAt: string;
}
export interface Schedule {
  id: string;
  type: ScheduleType;
  title: string;
  description: string | null;
  color: string;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  notification: NotificationInfo | null;
  createdAt: string;
  updatedAt: string;
}
export interface ScheduleRequest {
  type: ScheduleType;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  notifOffsetMin?: number;
}
export interface Timetable {
  id: string;
  title: string;
  description: string | null;
  color: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface TimetableRequest {
  title: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil?: string;
}
export interface Notification {
  id: string;
  scheduleId: string;
  scheduleTitle: string;
  offsetMin: number;
  notifyAt: string;
}
export interface ChatSession {
  id: string;
  title: string | null;
  modelName: string;
  lastActiveAt: string;
  createdAt: string;
}
export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  isSummarized: boolean;
  turnIndex: number;
  createdAt: string;
}
export interface MailAttachment {
  id: string;
  filename: string;
  contentType: string | null;
  sizeBytes: number | null;
  previewable: boolean; // true면 /view 로 브라우저에 바로 보여줄 수 있음 (이미지/영상/PDF)
}
export interface MailItem {
  id: string;
  fromAddress: string;
  subject: string | null;
  bodyPreview: string;
  attachmentCount: number;
  receivedAt: string;
}
export interface MailDetail {
  id: string;
  fromAddress: string;
  subject: string | null;
  body: string;
  bodyHtml: string | null; // 있으면 HTML로 렌더링, 없으면 body를 텍스트로 보여줌
  receivedAt: string;
  attachments: MailAttachment[];
}
export interface FileItem {
  id: string;
  parentId: string | null;
  name: string;
  isDirectory: boolean;
  sizeBytes?: number;
  extension?: string;
  mimeType?: string;
  thumbnailUrl?: string;
  previewable: boolean; // true면 /files/{id}/view 로 브라우저에 바로 띄울 수 있음 (이미지/영상/PDF), false면 다운로드만 가능
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}
