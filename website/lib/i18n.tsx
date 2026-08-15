'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { messages, type Locale, type MessageKey } from './messages';
import { CATEGORIES } from './types';

const LS_KEY = 'dsh-market-lang';

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('lang');
    if (q === 'zh' || q === 'en') return q;
  } catch {
    /* ignore */
  }
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  try {
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

function syncDocumentTitle(locale: Locale) {
  const market = messages[locale]['app.title'];
  const pageTitle = document.querySelector('h1.page-title')?.textContent?.trim();
  document.title = pageTitle ? `${pageTitle} · ${market}` : market;
}

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  catName: (id: string) => string;
  riskLabel: (level: string) => string;
  fmtDate: (iso: string) => string;
  fmtDateTime: (iso: string) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === 'undefined' ? 'zh' : detectLocale(),
  );

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    syncDocumentTitle(locale);
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => interpolate(messages[locale][key], vars),
      catName: (id) => {
        const c = CATEGORIES.find((x) => x.id === id);
        if (!c) return id;
        return locale === 'zh' ? c.name : c.nameEn;
      },
      riskLabel: (level) => {
        if (level === 'high') return messages[locale]['risk.high'];
        if (level === 'medium') return messages[locale]['risk.medium'];
        if (level === 'low') return messages[locale]['risk.low'];
        if (level === 'safe') return messages[locale]['risk.safe'];
        return messages[locale]['risk.unknown'];
      },
      fmtDate: (iso) => {
        const d = new Date(iso);
        if (!Number.isFinite(d.getTime())) return '—';
        return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US');
      },
      fmtDateTime: (iso) => {
        const d = new Date(iso);
        if (!Number.isFinite(d.getTime())) return '—';
        return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
