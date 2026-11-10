import { describe, expect, test } from 'vitest';
import { createTranslator, tText } from './index';

const t = createTranslator({
  id: { 'x.greet': 'Halo, {name}', 'x.only': 'Hanya ID' },
  en: { 'x.greet': 'Hi, {name}' },
});

describe('translate', () => {
  test('interpolates params', () => {
    expect(t('en', 'x.greet', { name: 'Rina' })).toBe('Hi, Rina');
    expect(t('id', 'x.greet', { name: 'Rina' })).toBe('Halo, Rina');
  });
  test('ISO date params render in the reader language', () => {
    const tt = createTranslator({ id: { d: 'Jatuh tempo {date}' }, en: { d: 'Due {date}' } });
    expect(tt('id', 'd', { date: '2026-08-10' })).toBe('Jatuh tempo 10 Agu 2026');
    expect(tt('en', 'd', { date: '2026-08-10' })).toBe('Due 10 Aug 2026');
  });
  test('falls back to Indonesian, then to the key', () => {
    expect(t('en', 'x.only')).toBe('Hanya ID');
    expect(t('en', 'x.missing')).toBe('x.missing');
  });
  test('tText resolves an I18nText', () => {
    expect(tText((k, p) => t('en', k, p), { key: 'x.greet', params: { name: 'Andi' } })).toBe('Hi, Andi');
  });
});

describe('dictionary parity', () => {
  const ids = import.meta.glob<{ default: Record<string, string> }>('./locales/id/*.ts', { eager: true });
  const ens = import.meta.glob<{ default: Record<string, string> }>('./locales/en/*.ts', { eager: true });
  test('every Indonesian file has an English twin with the same keys', () => {
    const missing: string[] = [];
    for (const [path, mod] of Object.entries(ids)) {
      const en = ens[path.replace('/id/', '/en/')];
      if (!en) { missing.push(`${path} (no en file)`); continue; }
      for (const key of Object.keys(mod.default)) if (!(key in en.default)) missing.push(`${path}: ${key}`);
    }
    expect(missing).toEqual([]);
  });
  test('no key is defined in two different files', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [path, mod] of Object.entries(ids)) {
      for (const key of Object.keys(mod.default)) {
        if (seen.has(key)) dupes.push(`${key} in ${seen.get(key)} and ${path}`);
        seen.set(key, path);
      }
    }
    expect(dupes).toEqual([]);
  });
});
