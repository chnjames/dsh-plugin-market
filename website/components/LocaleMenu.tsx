'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/messages';

const LOCALE_LABEL: Record<Locale, string> = { zh: '中文', en: 'EN' };

export function LocaleMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className="locale-menu" ref={rootRef}>
      <button
        type="button"
        className="tool-btn"
        aria-label={t('nav.language')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <Languages size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="tool-btn__label">{LOCALE_LABEL[locale]}</span>
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" className="tool-btn__chev" />
      </button>
      {open ? (
        <ul className="locale-menu__panel" id={menuId} role="menu">
          <li role="none">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === 'zh'}
              className={`locale-menu__item${locale === 'zh' ? ' is-active' : ''}`}
              onClick={() => pick('zh')}
            >
              <span>简体中文</span>
              {locale === 'zh' ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : null}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === 'en'}
              className={`locale-menu__item${locale === 'en' ? ' is-active' : ''}`}
              onClick={() => pick('en')}
            >
              <span>English</span>
              {locale === 'en' ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : null}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
