'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { RegistryPlugin } from '@/lib/types';
import { PluginCard } from '@/components/PluginSearch';
import { useI18n } from '@/lib/i18n';

type SortKey = 'stars' | 'updated' | 'name';

const PAGE_SIZE = 24;

function readSortFromUrl(): SortKey {
  try {
    const s = new URLSearchParams(window.location.search).get('sort');
    if (s === 'stars' || s === 'updated' || s === 'name') return s;
  } catch {
    /* ignore */
  }
  return 'stars';
}

function readPageFromUrl(): number {
  try {
    const p = Number(new URLSearchParams(window.location.search).get('page'));
    if (Number.isFinite(p) && p >= 1) return Math.floor(p);
  } catch {
    /* ignore */
  }
  return 1;
}

function writeQuery(sort: SortKey, page: number) {
  try {
    const params = new URLSearchParams(window.location.search);
    if (sort === 'stars') params.delete('sort');
    else params.set('sort', sort);
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  } catch {
    /* ignore */
  }
}

export function CategoryView({
  catId,
  plugins,
}: {
  catId: string;
  plugins: RegistryPlugin[];
}) {
  const { t, catName } = useI18n();
  const [sort, setSort] = useState<SortKey>('stars');
  const [page, setPage] = useState(1);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    setSort(readSortFromUrl());
    setPage(readPageFromUrl());
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    writeQuery(sort, page);
  }, [sort, page, urlReady]);

  const sorted = useMemo(() => {
    const list = [...plugins];
    if (sort === 'stars') list.sort((a, b) => b.stars - a.stars);
    else if (sort === 'updated') {
      list.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    } else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [plugins, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const slice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  function changeSort(next: SortKey) {
    setSort(next);
    setPage(1);
  }

  return (
    <main>
      <p className="crumb">
        <Link href="/">{t('cat.crumbHome')}</Link>
        <span aria-hidden="true"> / </span>
        {catName(catId)}
      </p>
      <header className="page-head">
        <h1 className="page-title">{catName(catId)}</h1>
        <p className="lede">{t('cat.count', { n: plugins.length })}</p>
      </header>

      <div className="toolbar" role="group" aria-label={t('cat.sortLabel')}>
        {(
          [
            ['stars', 'cat.sortStars'],
            ['updated', 'cat.sortUpdated'],
            ['name', 'cat.sortName'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`chip-btn${sort === key ? ' is-active' : ''}`}
            onClick={() => changeSort(key)}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <ul className="list-rows">
        {slice.map((p) => (
          <li key={p.id}>
            <PluginCard plugin={p} variant="row" />
          </li>
        ))}
      </ul>
      {plugins.length === 0 ? <p className="muted">{t('cat.empty')}</p> : null}

      {sorted.length > PAGE_SIZE ? (
        <div className="pager">
          <button
            type="button"
            className="chip-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('cat.prev')}
          </button>
          <span className="pager__meta">
            {t('cat.pagination', { page: safePage, pages, total: sorted.length })}
          </span>
          <button
            type="button"
            className="chip-btn"
            disabled={safePage >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            {t('cat.next')}
          </button>
        </div>
      ) : null}
    </main>
  );
}
