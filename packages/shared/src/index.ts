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
