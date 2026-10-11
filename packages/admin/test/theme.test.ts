import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { loadTheme, setTheme, useTheme } from '@/hooks/useTheme';
import { loadLocale } from '@/i18n';

describe('主题', () => {
  it('没有存储或值非法时为 system', () => {
    expect(loadTheme()).toBe('system');
    localStorage.setItem('cc-theme', 'blue');
    expect(loadTheme()).toBe('system');
  });
  it('light / dark 写入 data-theme 与本地存储', () => {
    setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('cc-theme')).toBe('dark');
  });
  it('system 移除 data-theme', () => {
    setTheme('dark');
    setTheme('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem('cc-theme')).toBe('system');
  });
  it('localStorage 抛错时不崩溃', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(loadTheme()).toBe('system');
    expect(() => setTheme('light')).not.toThrow();
    expect(loadLocale()).toBe('en');
    get.mockRestore();
    set.mockRestore();
  });
});

describe('useTheme', () => {
  it('toggle 在当前实际显示的深浅色之间切换，并通知所有使用方', () => {
    setTheme('system');
    const a = renderHook(() => useTheme());
    const b = renderHook(() => useTheme());
    expect(a.result.current.resolved).toBe('light');
    act(() => a.result.current.toggle());
    expect(a.result.current.theme).toBe('dark');
    expect(b.result.current.theme).toBe('dark');
    act(() => b.result.current.toggle());
    expect(a.result.current.theme).toBe('light');
    setTheme('system');
  });
});

describe('语言', () => {
  it('没有存储或值非法时为 en', () => {
    expect(loadLocale()).toBe('en');
    localStorage.setItem('cc-lang', 'fr');
    expect(loadLocale()).toBe('en');
    localStorage.setItem('cc-lang', 'zh-CN');
    expect(loadLocale()).toBe('zh-CN');
  });
});
