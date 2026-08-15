'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { RegistryPlugin } from '@/lib/types';
import { pluginSlug } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export function PluginCard({
  plugin,
  variant = 'card',
}: {
  plugin: RegistryPlugin;
  variant?: 'card' | 'row';
}) {
  const { catName, riskLabel, t } = useI18n();
  const className = variant === 'row' ? 'row' : 'card';

  return (
    <Link className={className} href={`/plugin/${pluginSlug(plugin.id)}/`}>
      <div className={`${className}-top`}>
        <strong>{plugin.name}</strong>
        <span className="stars">{plugin.stars}</span>
      </div>
      <p>{plugin.description || t('plugin.noDesc')}</p>
      <div className={`${className}-meta`}>
        <span>{catName(plugin.category)}</span>
        <span>{plugin.author}</span>
        {plugin.permissionLevel && plugin.permissionLevel !== 'unknown' ? (
          <span className={`risk risk-${plugin.permissionLevel}`}>
            {riskLabel(plugin.permissionLevel)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function ReadmeFrame({ plugin }: { plugin: RegistryPlugin }) {
  const { t } = useI18n();
  const [excerpt, setExcerpt] = useState<{ paragraphs: string[]; more: boolean }>({
    paragraphs: [t('readme.loading')],
    more: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!plugin.id.startsWith('github:')) {
        setExcerpt({ paragraphs: [t('readme.noGithub')], more: false });
        return;
      }
      const full = plugin.id.slice('github:'.length);
      const url = `https://cdn.jsdelivr.net/gh/${full}@HEAD/README.md`;
      try {
        const res = await fetch(url);
        const body = await res.text();
        if (cancelled) return;
        if (!res.ok || !body || body.startsWith("Couldn't find")) {
          setExcerpt({ paragraphs: [t('readme.fail')], more: false });
          return;
        }
        const cleaned = body
          .replace(/^---\n[\s\S]*?\n---\n/, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .split('\n')
          .filter((line) => {
            const x = line.trim();
            if (!x) return true;
            if (x.startsWith('|')) return false;
            if (
              x.startsWith('[![') ||
              x.startsWith('![') ||
              x.startsWith('<img') ||
              x.startsWith('<p align') ||
              x.startsWith('<div')
            ) {
              return false;
            }
            if (/^<\/?(h[1-6]|details|summary|table|thead|tbody|tr|td|th|center|p)\b/i.test(x)) {
              return false;
            }
            if (
              /^#{1,3}\s+(Install(ation)?|Getting Started|Usage|License|安装|使用|许可证)\b/i.test(x)
            ) {
              return false;
            }
            return true;
          })
          .join('\n')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
          .replace(/^#{1,3}\s+/gm, '')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        const paragraphs = cleaned
          .split(/\n\n/)
          .map((p) => p.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        const shown = paragraphs.slice(0, 5);
        setExcerpt({
          paragraphs: shown.length ? shown : [t('readme.badgeHeavy')],
          more: paragraphs.length > shown.length,
        });
      } catch {
        if (!cancelled) setExcerpt({ paragraphs: [t('readme.fail')], more: false });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [plugin.id, t]);

  return (
    <div className="readme">
      {excerpt.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {excerpt.more ? <p className="excerpt-note">{t('readme.excerpt')}</p> : null}
      {plugin.url ? (
        <p>
          <a href={plugin.url} rel="noreferrer">
            {t('readme.full')}
          </a>
        </p>
      ) : null}
    </div>
  );
}
