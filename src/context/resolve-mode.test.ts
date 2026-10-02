import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveElementMode, resolveRequestedMode } from './resolve-mode.js';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--ui9000-mode');
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('resolveRequestedMode', () => {
  it('follows prefers-color-scheme only for auto', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(resolveRequestedMode('auto')).toBe('dark');
    expect(resolveRequestedMode('light')).toBe('light');
    expect(resolveRequestedMode('dark')).toBe('dark');
  });
});

describe('resolveElementMode', () => {
  it('prefers an explicit --ui9000-mode on an ancestor', () => {
    document.documentElement.style.setProperty('--ui9000-mode', 'dark');
    document.documentElement.setAttribute('data-theme', 'light');
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(resolveElementMode(el)).toBe('dark');
  });

  it('uses data-theme when no mode variable is set', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(resolveElementMode(el)).toBe('dark');
  });

  it('lets a nearer mode variable win over data-theme', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const host = document.createElement('div');
    host.style.setProperty('--ui9000-mode', 'light');
    const el = document.createElement('span');
    host.appendChild(el);
    document.body.appendChild(host);
    expect(resolveElementMode(el)).toBe('light');
  });

  it('falls back to the browser scheme, then light', () => {
    const el = document.createElement('div');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(resolveElementMode(el)).toBe('dark');

    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(resolveElementMode(el)).toBe('light');
  });
});
