const enc = new TextEncoder();

export function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256(s: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', enc.encode(s));
}

export async function sha256Hex(s: string): Promise<string> {
  return hex(await sha256(s));
}

export async function hmac(secret: string, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, enc.encode(message));
}

/** 先各自哈希成等长再做常量时间比较，避免长度泄露 */
export async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  return (crypto.subtle as any).timingSafeEqual(ha, hb) as boolean;
}
