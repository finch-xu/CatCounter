export function referrerOf(raw: string | undefined, origins: string[]): string {
  if (!raw) return 'direct';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'direct';
  }
  const host = url.hostname.toLowerCase();
  if (!host) return 'direct';
  const strippedHost = host.replace(/^www\./, '');
  const ownHosts = new Set<string>();
  for (const o of origins) {
    try {
      const originHost = new URL(o).hostname.toLowerCase();
      ownHosts.add(originHost.replace(/^www\./, ''));
    } catch {
      // 忽略非法 origin
    }
  }
  if (ownHosts.has(strippedHost)) return 'direct';
  if (strippedHost.length > 255 || !/^[a-z0-9.-]+$/.test(strippedHost)) return 'direct';
  return strippedHost;
}
