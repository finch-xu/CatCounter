import { describe, expect, it } from 'vitest';
import { sha256Hex, timingSafeEqualStr } from '../src/lib/crypto';
import { dailySalt, dayOf, visitorHash } from '../src/lib/hash';
import { createSession, verifySession } from '../src/lib/session';
import { deviceOf, isBot } from '../src/lib/ua';
import { referrerOf } from '../src/lib/referrer';
import { normalizeOrigin, originAllowed } from '../src/lib/origin';

describe('crypto', () => {
  it('sha256Hex is deterministic', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('timingSafeEqualStr compares', async () => {
    expect(await timingSafeEqualStr('a', 'a')).toBe(true);
    expect(await timingSafeEqualStr('a', 'b')).toBe(false);
    expect(await timingSafeEqualStr('a', 'ab')).toBe(false);
  });
});

describe('hash', () => {
  it('dayOf formats UTC date', () => {
    expect(dayOf(Date.UTC(2026, 8, 13, 23, 59) / 1000)).toBe('2026-09-13');
  });
  it('salt changes with day and hash changes with salt', async () => {
    const s1 = await dailySalt('secret', '2026-09-13');
    const s2 = await dailySalt('secret', '2026-09-14');
    expect(s1).not.toBe(s2);
    const h1 = await visitorHash(s1, '1.2.3.4', 'UA');
    const h2 = await visitorHash(s2, '1.2.3.4', 'UA');
    expect(h1).toHaveLength(32);
    expect(h1).not.toBe(h2);
    expect(await visitorHash(s1, '1.2.3.4', 'UA')).toBe(h1);
  });
});

describe('session', () => {
  it('round trips and expires', async () => {
    const now = 1_800_000_000;
    const v = await createSession('secret', now);
    expect(await verifySession('secret', v, now + 10)).toBe(true);
    expect(await verifySession('secret', v, now + 8 * 86400)).toBe(false);
    expect(await verifySession('other', v, now + 10)).toBe(false);
    expect(await verifySession('secret', v + 'x', now + 10)).toBe(false);
    expect(await verifySession('secret', undefined, now)).toBe(false);
    expect(await verifySession('secret', 'garbage', now)).toBe(false);
  });
});

describe('ua', () => {
  it('detects bots', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBot('curl/8.0')).toBe(true);
    expect(isBot('')).toBe(true);
    expect(isBot('Mozilla/5.0 (Macintosh) Chrome/120')).toBe(false);
  });
  it('classifies devices', () => {
    expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari')).toBe('mobile');
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0) Safari')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14; SM-X900) Safari')).toBe('tablet');
    expect(deviceOf('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari')).toBe('mobile');
    expect(deviceOf('Mozilla/5.0 (Windows NT 10.0) Chrome/120')).toBe('desktop');
  });
});

describe('referrer', () => {
  const origins = ['https://blog.example.com'];
  it('returns direct for empty or same-site', () => {
    expect(referrerOf(undefined, origins)).toBe('direct');
    expect(referrerOf('', origins)).toBe('direct');
    expect(referrerOf('https://blog.example.com/posts/a/', origins)).toBe('direct');
  });
  it('returns host without www', () => {
    expect(referrerOf('https://www.google.com/search?q=x', origins)).toBe('google.com');
    expect(referrerOf('http://t.co/abc', origins)).toBe('t.co');
    expect(referrerOf('https://blog.example.com/x', ['https://www.blog.example.com'])).toBe('direct');
    expect(referrerOf('https://www.blog.example.com/x', ['https://blog.example.com'])).toBe('direct');
  });
  it('returns direct for invalid url', () => {
    expect(referrerOf('not a url', origins)).toBe('direct');
  });
});

describe('origin', () => {
  it('normalizes origins', () => {
    expect(normalizeOrigin('https://Blog.Example.com/')).toBe('https://blog.example.com');
    expect(normalizeOrigin('http://localhost:4000/path')).toBe('http://localhost:4000');
    expect(normalizeOrigin('blog.example.com')).toBeNull();
    expect(normalizeOrigin('')).toBeNull();
  });
  it('matches exactly', () => {
    const origins = ['https://blog.example.com'];
    expect(originAllowed(origins, 'https://blog.example.com')).toBe(true);
    expect(originAllowed(origins, 'https://BLOG.example.com')).toBe(true);
    expect(originAllowed(origins, 'https://evil.com')).toBe(false);
    expect(originAllowed(origins, undefined)).toBe(false);
    expect(originAllowed([], 'https://blog.example.com')).toBe(false);
  });
});
