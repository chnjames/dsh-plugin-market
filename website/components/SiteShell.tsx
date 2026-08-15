'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CommandPalette, useCommandPaletteHotkey } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { LocaleMenu } from './LocaleMenu';
import { useI18n } from '@/lib/i18n';

export function SiteShell({
  children,
  generatedAt,
}: {
  children: React.ReactNode;
  generatedAt?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  useCommandPaletteHotkey(toggle);
  const { t, fmtDateTime } = useI18n();

  return (
    <div className="wrap">
      <header className="site-header">
        <div className="nav__brand-row">
          <Link className="brand" href="/">
            <span className="brand__mark" aria-hidden="true">
              D
            </span>
            DSH <span>{t('brand.market')}</span>
          </Link>
          <button
            type="button"
            className="searchpill"
            aria-label={t('nav.searchAria')}
            onClick={() => setOpen(true)}
          >
            <span className="searchpill__text">{t('nav.search')}</span>
            <span className="searchpill__kbd" aria-hidden="true">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
          </button>
        </div>
        <nav className="nav" aria-label={t('nav.site')}>
          {generatedAt ? (
            <span className="nav__meta" title={generatedAt}>
              {t('nav.snapshot', { time: fmtDateTime(generatedAt) })}
            </span>
          ) : (
            <span className="nav__meta">{t('nav.snapshotMissing')}</span>
          )}
          <div className="nav__tools">
            <LocaleMenu />
            <ThemeToggle />
            <a className="tool-btn tool-btn--ghost" href="https://www.deepseek.com/harness/" rel="noreferrer">
              {t('nav.harness')}
            </a>
            <a
              className="tool-btn tool-btn--ghost"
              href="https://github.com/deepseek-ai/deepseek-harness"
              rel="noreferrer"
            >
              {t('nav.github')}
            </a>
            <a
              className="tool-btn tool-btn--accent"
              href="https://github.com/chnjames/dsh-plugin-market"
              rel="noreferrer"
            >
              {t('nav.repo')}
            </a>
          </div>
        </nav>
      </header>

      {children}

      <footer className="site-footer">
        <p>
          {t('footer.line')}
          {' · '}
          {t('footer.disclaimer')}
        </p>
      </footer>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}
