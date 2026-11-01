import { z } from 'zod';
import type { ScheduleType } from '../types';

// 일정 등록/수정 폼 검증. type에 따라 어떤 필드가 필수인지가 달라져서(TIMED면 시작/종료 시간
// 둘 다, MOMENT면 시작 시간만, PERIOD면 종료 날짜) superRefine으로 조건부 검사를 묶어둠.
export const scheduleFormSchema = z
  .object({
    title: z.string().trim().min(1, '제목을 입력해주세요'),
    type: z.custom<ScheduleType>(),
    startDate: z.string().min(1, '날짜를 선택해주세요'),
    endDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'PERIOD') {
      if (!data.endDate) {
        ctx.addIssue({ code: 'custom', message: '종료 날짜를 선택해주세요', path: ['endDate'] });
      } else if (data.endDate < data.startDate) {
        ctx.addIssue({ code: 'custom', message: '종료 날짜는 시작 날짜 이후여야 해요', path: ['endDate'] });
      }
    }
    if (data.type === 'TIMED' || data.type === 'MOMENT') {
      if (!data.startTime) {
        ctx.addIssue({ code: 'custom', message: '시작 시간을 입력해주세요', path: ['startTime'] });
      }
    }
    if (data.type === 'TIMED') {
      if (!data.endTime) {
        ctx.addIssue({ code: 'custom', message: '종료 시간을 입력해주세요', path: ['endTime'] });
      } else if (data.startTime && data.endTime <= data.startTime) {
        ctx.addIssue({ code: 'custom', message: '종료 시간은 시작 시간 이후여야 해요', path: ['endTime'] });
      }
    }
  });

export type ScheduleFormInput = z.input<typeof scheduleFormSchema>;

// 시간표 등록/수정 폼 검증
export const timetableFormSchema = z
  .object({
    title: z.string().trim().min(1, '제목을 입력해주세요'),
    selectedDays: z.array(z.number()).min(1, '요일을 하나 이상 선택해주세요'),
    startTime: z.string().min(1, '시작 시간을 입력해주세요'),
    endTime: z.string().min(1, '종료 시간을 입력해주세요'),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({ code: 'custom', message: '종료 시간은 시작 시간 이후여야 해요', path: ['endTime'] });
    }
  });

export type TimetableFormInput = z.input<typeof timetableFormSchema>;

// zod 에러를 "필드명 -> 에러 문구 하나" 맵으로 평탄화 - 폼에서 필드별로 바로 꺼내 쓰기 쉽게
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const result: Record<string, string> = {};
  for (const key in fieldErrors) {
    const messages = fieldErrors[key];
    if (messages && messages.length > 0) result[key] = messages[0];
  }
  return result;
}
