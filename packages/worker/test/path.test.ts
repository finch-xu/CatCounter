import { describe, expect, it } from 'vitest';
import { normalizePath } from '@catcounter/shared';

describe('normalizePath', () => {
  it('keeps root', () => expect(normalizePath('/')).toBe('/'));
  it('adds trailing slash', () => expect(normalizePath('/posts/hello')).toBe('/posts/hello/'));
  it('keeps trailing slash', () => expect(normalizePath('/posts/hello/')).toBe('/posts/hello/'));
  it('strips query and hash', () => expect(normalizePath('/a/?x=1#top')).toBe('/a/'));
  it('strips index.html', () => expect(normalizePath('/a/index.html')).toBe('/a/'));
  it('collapses slashes', () => expect(normalizePath('//a///b')).toBe('/a/b/'));
  it('keeps files with extension', () => expect(normalizePath('/about.html')).toBe('/about.html'));
  it('decodes percent encoding', () => expect(normalizePath('/%E4%BD%A0%E5%A5%BD')).toBe('/你好/'));
  it('handles empty input', () => expect(normalizePath('')).toBe('/'));
});
