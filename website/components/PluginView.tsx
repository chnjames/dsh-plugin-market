'use client';

import Link from 'next/link';
import type { RegistryPlugin } from '@/lib/types';
import { InstallTerminal } from '@/components/InstallTerminal';
import { ReadmeFrame } from '@/components/PluginSearch';
import { useI18n } from '@/lib/i18n';

export function PluginView({
  plugin,
  catId,
  installCmd,
}: {
  plugin: RegistryPlugin;
  catId?: string;
  installCmd: string;
}) {
  const { t, catName, riskLabel, fmtDate } = useI18n();

  return (
    <main>
      <p className="crumb">
        <Link href="/">{t('cat.crumbHome')}</Link>
        {catId ? (
          <>
            <span aria-hidden="true"> / </span>
            <Link href={`/category/${catId}/`}>{catName(catId)}</Link>
          </>
        ) : null}
      </p>
      <header className="page-head">
        <h1 className="page-title">{plugin.name}</h1>
        <p className="lede">{plugin.description || t('plugin.noDesc')}</p>
      </header>

      <InstallTerminal tabs={[{ id: 'install', label: t('plugin.installTab'), command: installCmd }]} />

      <div className="detail-actions">
        <a className="btn btn--ghost" href={plugin.url} rel="noreferrer">
          {t('plugin.openRepo')}
        </a>
      </div>

      <dl className="meta-grid">
        <dt>{t('plugin.author')}</dt>
        <dd>{plugin.author || '—'}</dd>
        <dt>{t('plugin.stars')}</dt>
        <dd>{plugin.stars}</dd>
        <dt>{t('plugin.license')}</dt>
        <dd>{plugin.license || '—'}</dd>
        {plugin.permissionLevel && plugin.permissionLevel !== 'unknown' ? (
          <>
            <dt>{t('plugin.hint')}</dt>
            <dd className={`risk-${plugin.permissionLevel}`}>{riskLabel(plugin.permissionLevel)}</dd>
          </>
        ) : null}
        <dt>{t('plugin.source')}</dt>
        <dd>
          <a href={plugin.url} rel="noreferrer">
            {plugin.url}
          </a>
        </dd>
        <dt>{t('plugin.updated')}</dt>
        <dd>{plugin.updatedAt ? fmtDate(plugin.updatedAt) : '—'}</dd>
      </dl>

      <section className="rail" aria-labelledby="about-title">
        <div className="section-head">
          <h2 id="about-title" className="section-title">
            {t('plugin.about')}
          </h2>
        </div>
        <ReadmeFrame plugin={plugin} />
      </section>
    </main>
  );
}
