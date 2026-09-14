import type { ApiErrorBody, ApiErrorCode } from '@catcounter/shared';

const MESSAGES: Record<ApiErrorCode, string> = {
  unauthorized: 'Unauthorized',
  bad_json: 'Invalid JSON body',
  wrong_password: 'Incorrect password',
  site_name_required: 'Site name is required',
  invalid_origins: 'Provide at least one valid origin, e.g. https://blog.example.com',
  invalid_retention: 'Retention days must be a positive integer or null',
  invalid_counter: 'Counts must be non-negative integers',
  path_required: 'Path is required',
  not_found: 'Not found',
  invalid_date: 'Dates must be in YYYY-MM-DD format',
  date_range_inverted: 'Start date must not be after end date',
  date_range_too_long: 'Date range can be at most {max} days',
  not_configured: 'Service is not configured: set {names} in the Cloudflare dashboard, then redeploy',
  internal_error: 'Internal error',
};

/** 生成错误响应体；英文说明里的 {key} 用 params 填充 */
export function apiError(code: ApiErrorCode, params?: ApiErrorBody['params']): ApiErrorBody {
  const error = MESSAGES[code].replace(/\{(\w+)\}/g, (_, k: string) => String(params?.[k] ?? ''));
  return params ? { error, code, params } : { error, code };
}
