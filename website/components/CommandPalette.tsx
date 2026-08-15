'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { RegistryPlugin } from '@/lib/types';
import { pluginSlug } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function matchPlugins(plugins: RegistryPlugin[], q: string, limit = 24): RegistryPlugin[] {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return [...plugins].sort((a, b) => b.stars - a.stars).slice(0, 8);
  }
  return plugins
    .filter((p) =>
      [p.name, p.description, p.author, p.id, ...(p.topics || []), ...(p.keywords || [])]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
    .slice(0, limit);
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { t, catName } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [plugins, setPlugins] = useState<RegistryPlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const results = useMemo(() => matchPlugins(plugins, q), [plugins, q]);

  useEffect(() => {
    if (!open || plugins.length > 0) return;
    let cancelled = false;
    setLoading(true);
    fetch('/registry.json')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPlugins(Array.isArray(data?.plugins) ? data.plugins : []);
      })
      .catch(() => {
        if (!cancelled) setPlugins([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, plugins.length]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function close() {
    onOpenChange(false);
  }

  function go(plugin: RegistryPlugin) {
    close();
    router.push(`/plugin/${pluginSlug(plugin.id)}/`);
  }

  function openActive() {
    const plugin = results[active];
    if (plugin) go(plugin);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      inputRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      inputRef.current?.focus();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      openActive();
    }
  }

  if (!open) return null;

  const emptyQuery = !q.trim();

  return (
    <div className="cmdk is-open" role="presentation">
      <button type="button" className="cmdk__backdrop" aria-label={t('cmdk.closeAria')} onClick={close} />
      <div
        className="cmdk__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('cmdk.title')}
        onKeyDown={onKeyDown}
      >
        <div className="cmdk__field">
          <input
            ref={inputRef}
            id="cmdk-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('cmdk.placeholder')}
            autoComplete="off"
          />
          <kbd>esc</kbd>
        </div>
        <div className="cmdk__results">
          <p className="cmdk__group">
            {loading ? t('cmdk.loading') : emptyQuery ? t('cmdk.hot') : t('cmdk.results')}
          </p>
          {results.map((p, i) => (
            <button
              key={p.id}
              type="button"
              tabIndex={-1}
              className={`cmdk__item${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(p)}
            >
              <span className="cmdk__item-name">{p.name}</span>
              <span className="cmdk__item-meta">
                {catName(p.category)} · ★{p.stars}
              </span>
            </button>
          ))}
          {!loading && results.length === 0 ? <p className="cmdk__empty">{t('cmdk.empty')}</p> : null}
        </div>
        <div className="cmdk__foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {t('cmdk.nav')}
          </span>
          <span>
            <kbd>↵</kbd> {t('cmdk.open')}
          </span>
          <span>
            <kbd>esc</kbd> {t('cmdk.close')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPaletteHotkey(onToggle: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onToggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle]);
}
