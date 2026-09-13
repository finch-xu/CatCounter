import { hex, hmac, sha256Hex } from './crypto';

export function dayOf(nowSec: number): string {
  return new Date(nowSec * 1000).toISOString().slice(0, 10);
}

export async function dailySalt(secret: string, day: string): Promise<string> {
  return hex(await hmac(secret, 'visitor:' + day));
}

export async function visitorHash(salt: string, ip: string, ua: string): Promise<string> {
  return (await sha256Hex(`${salt}|${ip}|${ua}`)).slice(0, 32);
}
