export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    origins TEXT NOT NULL DEFAULT '[]',
    pv INTEGER NOT NULL DEFAULT 0,
    uv INTEGER NOT NULL DEFAULT 0,
    retention_days INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tokens (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    revoked_at INTEGER,
    last_used_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tokens_site ON tokens(site_id)`,
  `CREATE TABLE IF NOT EXISTS pages (
    site_id TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT,
    pv INTEGER NOT NULL DEFAULT 0,
    uv INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    PRIMARY KEY (site_id, path)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pages_site_pv ON pages(site_id, pv DESC)`,
  `CREATE TABLE IF NOT EXISTS daily_site (
    site_id TEXT NOT NULL,
    day TEXT NOT NULL,
    pv INTEGER NOT NULL DEFAULT 0,
    uv INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (site_id, day)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_page (
    site_id TEXT NOT NULL,
    day TEXT NOT NULL,
    path TEXT NOT NULL,
    pv INTEGER NOT NULL DEFAULT 0,
    uv INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (site_id, day, path)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_daily_page_site_day ON daily_page(site_id, day)`,
  `CREATE TABLE IF NOT EXISTS daily_dim (
    site_id TEXT NOT NULL,
    day TEXT NOT NULL,
    dim TEXT NOT NULL,
    value TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (site_id, day, dim, value)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_daily_dim_site_day_dim ON daily_dim(site_id, day, dim)`,
  `CREATE TABLE IF NOT EXISTS seen (
    site_id TEXT NOT NULL,
    day TEXT NOT NULL,
    hash TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (site_id, day, hash, path)
  )`,
];

let ready: Promise<void> | null = null;

/** 仅测试使用：清除记忆，让下一次 ensureSchema 重新建表 */
export function resetSchemaCache(): void {
  ready = null;
}

/** 每个 isolate 只执行一次；失败则允许下次重试 */
export function ensureSchema(db: D1Database): Promise<void> {
  if (!ready) {
    ready = db
      .batch(SCHEMA_STATEMENTS.map((s) => db.prepare(s)))
      .then(() => undefined)
      .catch((err) => {
        ready = null;
        throw err;
      });
  }
  return ready;
}
