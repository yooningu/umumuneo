import { z } from 'zod';

export const emailAliasSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]{3,20}$/, '영소문자/숫자 3~20자로 입력해주세요.');
