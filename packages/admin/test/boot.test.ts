import { beforeEach, describe, expect, it, vi } from 'vitest';
import css from '../src/index.css?raw';
import html from '../index.html?raw';

const bootScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';
const run = () => new Function(bootScript)();
const theme = () => document.documentElement.getAttribute('data-theme');

describe('index.html 的启动脚本', () => {
  beforeEach(() => document.documentElement.removeAttribute('data-theme'));

  it('在任何模块加载前应用已保存的深色 / 浅色主题', () => {
    expect(bootScript).not.toBe('');
    localStorage.setItem('cc-theme', 'dark');
    run();
    expect(theme()).toBe('dark');
    localStorage.setItem('cc-theme', 'light');
    run();
    expect(theme()).toBe('light');
  });
  it('system、非法值或没有存储时不设置 data-theme', () => {
    for (const v of ['system', 'blue', null]) {
      if (v === null) localStorage.removeItem('cc-theme');
      else localStorage.setItem('cc-theme', v);
      run();
      expect(theme()).toBeNull();
    }
  });
  it('localStorage 抛错时不抛错', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(run).not.toThrow();
    get.mockRestore();
  });
});

/** WCAG 相对亮度与对比度 */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('设计令牌', () => {
  it('文字用霞鹜文楷、纯数字用系统字体，并且不做算法描粗', () => {
    expect(css).toContain('--font-sans: "LXGW WenKai Screen", system-ui, sans-serif;');
    expect(css).toContain('--font-num: system-ui, sans-serif;');
    // 文楷只有一个字重，浏览器硬描出来的粗体会糊
    expect(css).toContain('font-synthesis-weight: none;');
  });
  it('浅色与深色下主按钮文字对比度都不低于 4.5:1', () => {
    const primaries = [...css.matchAll(/--primary: (#[0-9a-f]{6});/g)].map((m) => m[1]!);
    const foregrounds = [...css.matchAll(/--primary-foreground: (#[0-9a-f]{6});/g)].map((m) => m[1]!);
    expect(primaries).toHaveLength(3);
    expect(foregrounds).toHaveLength(3);
    primaries.forEach((p, i) => expect(contrast(p, foregrounds[i]!), `${p} / ${foregrounds[i]}`).toBeGreaterThanOrEqual(4.5));
  });
});
