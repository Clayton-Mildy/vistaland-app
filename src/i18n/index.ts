import { useCallback, useSyncExternalStore } from 'react';
import type { I18nText, Lang } from '../domain/types';

export type Dict = Record<string, string>;
export type Params = Record<string, string | number>;
export type TFn = (key: string, params?: Params) => string;

const interpolate = (s: string, params?: Params) =>
  params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)) : s;

/** Builds a translator over explicit dictionaries: EN falls back to ID, then to the key. */
export function createTranslator(dicts: Record<Lang, Dict>) {
  return (lang: Lang, key: string, params?: Params): string => {
    const s = dicts[lang][key] ?? dicts.id[key] ?? key;
    return interpolate(s, params);
  };
}

// Every task ships its own locales/<lang>/<namespace>.ts file; they are merged here.
const load = (mods: Record<string, { default: Dict }>): Dict =>
  Object.values(mods).reduce<Dict>((acc, m) => Object.assign(acc, m.default), {});
const DICTS: Record<Lang, Dict> = {
  id: load(import.meta.glob<{ default: Dict }>('./locales/id/*.ts', { eager: true })),
  en: load(import.meta.glob<{ default: Dict }>('./locales/en/*.ts', { eager: true })),
};

export const translate = createTranslator(DICTS);
export const tText = (t: TFn, text: I18nText) => t(text.key, text.params);

// Language preference: per device, shared across tabs via the storage event.
const LANG_KEY = 'vhome.lang';
const listeners = new Set<() => void>();
let current: Lang = readLang();

function readLang(): Lang {
  try {
    return (globalThis.localStorage?.getItem(LANG_KEY) as Lang) === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}
export function getLang(): Lang {
  return current;
}
export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((f) => f());
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LANG_KEY) {
      current = readLang();
      listeners.forEach((f) => f());
    }
  });
}
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};

export function useLang(): [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return [lang, setLang];
}
export function useT(): TFn {
  const [lang] = useLang();
  return useCallback((key: string, params?: Params) => translate(lang, key, params), [lang]);
}
