import type { Site, Token } from '@catcounter/shared';
import { rowToSite, type SiteRow } from './sites';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let s = 'cc_';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

export async function createToken(
  db: D1Database,
  siteId: string,
  name: string,
  nowSec: number,
): Promise<Token> {
  const token: Token = {
    id: crypto.randomUUID(),
    site_id: siteId,
    token: generateToken(),
    name,
    created_at: nowSec,
    revoked_at: null,
    last_used_at: null,
  };
  await db
    .prepare('INSERT INTO tokens (id, site_id, token, name, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(token.id, token.site_id, token.token, token.name, token.created_at)
    .run();
  return token;
}

export async function listTokens(db: D1Database, siteId: string): Promise<Token[]> {
  const r = await db
    .prepare('SELECT * FROM tokens WHERE site_id = ? ORDER BY created_at ASC')
    .bind(siteId)
    .all<Token>();
  return r.results;
}

export async function revokeToken(
  db: D1Database,
  siteId: string,
  tokenId: string,
  nowSec: number,
): Promise<boolean> {
  const r = await db
    .prepare('UPDATE tokens SET revoked_at = ? WHERE id = ? AND site_id = ? AND revoked_at IS NULL')
    .bind(nowSec, tokenId, siteId)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export async function findActiveToken(
  db: D1Database,
  token: string,
): Promise<{ token: Token; site: Site } | null> {
  const row = await db
    .prepare(
      `SELECT t.id AS t_id, t.site_id AS t_site_id, t.token AS t_token, t.name AS t_name,
              t.created_at AS t_created_at, t.revoked_at AS t_revoked_at, t.last_used_at AS t_last_used_at,
              s.id, s.name, s.origins, s.pv, s.uv, s.retention_days, s.created_at
       FROM tokens t JOIN sites s ON s.id = t.site_id
       WHERE t.token = ? AND t.revoked_at IS NULL`,
    )
    .bind(token)
    .first<SiteRow & {
      t_id: string; t_site_id: string; t_token: string; t_name: string;
      t_created_at: number; t_revoked_at: number | null; t_last_used_at: number | null;
    }>();
  if (!row) return null;
  return {
    token: {
      id: row.t_id,
      site_id: row.t_site_id,
      token: row.t_token,
      name: row.t_name,
      created_at: row.t_created_at,
      revoked_at: row.t_revoked_at,
      last_used_at: row.t_last_used_at,
    },
    site: rowToSite(row),
  };
}
