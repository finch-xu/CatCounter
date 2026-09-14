import type { ApiErrorCode } from '@catcounter/shared';
import type en from './locales/en';

export type MessageSchema = typeof en;

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

/** 编译期检查：errors 恰好覆盖后端的全部错误码（外加前端自己的 requestFailed） */
export type ErrorsCoverApiCodes = Assert<Equal<keyof MessageSchema['errors'], ApiErrorCode | 'requestFailed'>>;
