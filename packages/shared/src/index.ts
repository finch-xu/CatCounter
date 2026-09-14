export { normalizePath } from './path';

export interface Counts { pv: number; uv: number }

export interface HitRequest { token: string; path: string; title?: string; referrer?: string }
export interface HitResponse { site: Counts; page: Counts }
export interface CountsResponse { site: Counts; pages: Record<string, Counts> }

export interface Site {
  id: string;
  name: string;
  origins: string[];
  pv: number;
  uv: number;
  retention_days: number | null;
  created_at: number;
}

export interface Token {
  id: string;
  site_id: string;
  token: string;
  name: string;
  created_at: number;
  revoked_at: number | null;
  last_used_at: number | null;
}

export type Dim = 'referrer' | 'country' | 'device';

export interface DayPoint { day: string; pv: number; uv: number }
export interface PageStat { path: string; title: string | null; pv: number; uv: number }
export interface DimStat { value: string; count: number }

export interface SiteStats {
  from: string;
  to: string;
  series: DayPoint[];
  pages: PageStat[];
  referrers: DimStat[];
  countries: DimStat[];
  devices: DimStat[];
}

export interface SiteSummary extends Site { today: Counts }

export interface Overview {
  sites: SiteSummary[];
  totals: { sites: number; today: Counts; all: Counts };
  series: DayPoint[];
}

export interface PageRow { path: string; title: string | null; pv: number; uv: number; last_seen: number }

export type ApiErrorCode =
  | 'unauthorized'
  | 'bad_json'
  | 'wrong_password'
  | 'site_name_required'
  | 'invalid_origins'
  | 'invalid_retention'
  | 'invalid_counter'
  | 'path_required'
  | 'not_found'
  | 'invalid_date'
  | 'date_range_inverted'
  | 'date_range_too_long'
  | 'not_configured'
  | 'internal_error';

/** 后台接口的错误响应：error 是英文说明，code 供后台按界面语言翻译，params 是翻译用的插值 */
export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
  params?: Record<string, string | number>;
}
