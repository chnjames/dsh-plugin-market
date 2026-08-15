'use client';

import Link from 'next/link';
import type { RegistryPlugin } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { PluginCard } from '@/components/PluginSearch';
import { InstallTerminal } from '@/components/InstallTerminal';
import { useI18n } from '@/lib/i18n';

type Props = {
  total: number;
  source: string;
  counts: Record<string, number>;
  hot: RegistryPlugin[];
  recent: RegistryPlugin[];
  selfInstall: string;
  npxBoot: string;
};

export function HomeView({
  total,
  source,
  counts,
  hot,
  recent,
  selfInstall,
  npxBoot,
}: Props) {
  const { t, catName } = useI18n();

  return (
    <main>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.h1')}</h1>
          <p className="lede">{t('home.lede', { total })}</p>
          <div className="hero__actions">
            <a className="btn btn--primary" href="https://www.deepseek.com/harness/" rel="noreferrer">
              {t('home.ctaHarness')}
            </a>
            <a
              className="btn btn--ghost"
              href="https://github.com/deepseek-ai/deepseek-harness"
              rel="noreferrer"
            >
              {t('home.ctaDocs')}
            </a>
          </div>
        </div>
        <InstallTerminal
          tabs={[
            { id: 'market', label: t('home.tabMarket'), command: selfInstall },
            { id: 'boot', label: t('home.tabBoot'), command: npxBoot },
          ]}
        />
      </section>

      <section className="howto" aria-labelledby="howto-title">
        <div className="howto__copy">
          <h2 id="howto-title">{t('home.howtoTitle')}</h2>
          <p>{t('home.howtoBody')}</p>
          <ol className="howto__steps">
            <li>{t('home.howto1')}</li>
            <li>{t('home.howto2')}</li>
            <li>{t('home.howto3')}</li>
          </ol>
        </div>
        <figure className="howto__figure">
          <img
            src="/images/settings-market.png"
            alt={t('home.howtoImgAlt')}
            width={960}
            height={640}
          />
        </figure>
      </section>

      <section className="rail" aria-labelledby="hot-title">
        <div className="section-head">
          <h2 id="hot-title" className="section-title">
            {t('home.hot')}
          </h2>
          <span className="section-note">{t('home.hotNote')}</span>
        </div>
        <ul className="card-grid">
          {hot.map((p) => (
            <li key={p.id}>
              <PluginCard plugin={p} />
            </li>
          ))}
        </ul>
        {hot.length === 0 ? <p className="muted">{t('home.emptyRegistry')}</p> : null}
      </section>

      <section className="rail" aria-labelledby="cats-title">
        <div className="section-head">
          <h2 id="cats-title" className="section-title">
            {t('home.cats')}
          </h2>
          <span className="section-note">
            {t('home.catsNote', { n: CATEGORIES.length, source: source || '—' })}
          </span>
        </div>
        <ul className="cat-rail">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link className="cat-chip" href={`/category/${c.id}/`}>
                <strong>{catName(c.id)}</strong>
                <span>{counts[c.id] || 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rail" aria-labelledby="recent-title">
        <div className="section-head">
          <h2 id="recent-title" className="section-title">
            {t('home.recent')}
          </h2>
          <span className="section-note">{t('home.recentNote')}</span>
        </div>
        <ul className="card-grid">
          {recent.map((p) => (
            <li key={p.id}>
              <PluginCard plugin={p} />
            </li>
          ))}
        </ul>
      </section>

      <p className="install-note">{t('home.note')}</p>
    </main>
  );
}
