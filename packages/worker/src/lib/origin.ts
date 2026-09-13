/** 把用户输入规范成 scheme://host[:port]，非法返回 null */
export function normalizeOrigin(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function originAllowed(origins: string[], origin: string | undefined): boolean {
  if (!origin) return false;
  const o = origin.toLowerCase();
  return origins.some((x) => x.toLowerCase() === o);
}
