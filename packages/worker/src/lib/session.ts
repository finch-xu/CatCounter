import { hmac, timingSafeEqualStr } from './crypto';

const SESSION_TTL = 7 * 86400;
const enc = new TextEncoder();

function b64u(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return atob(padded);
}

export async function createSession(secret: string, nowSec: number): Promise<string> {
  const payload = b64u(enc.encode(JSON.stringify({ iat: nowSec, exp: nowSec + SESSION_TTL })));
  const sig = b64u(await hmac(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifySession(
  secret: string,
  value: string | undefined,
  nowSec: number,
): Promise<boolean> {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = b64u(await hmac(secret, payload));
  if (!(await timingSafeEqualStr(sig, expected))) return false;
  try {
    const data = JSON.parse(b64uDecode(payload)) as { exp?: unknown };
    return typeof data.exp === 'number' && data.exp > nowSec;
  } catch {
    return false;
  }
}
