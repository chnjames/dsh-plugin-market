'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { RegistryPlugin } from '@/lib/types';
import { CATEGORIES, pluginSlug, riskLabel } from '@/lib/types';

export function PluginSearch({ plugins }: { plugins: RegistryPlugin[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return plugins.slice(0, 24);
    return plugins
      .filter((p) =>
        [p.name, p.description, p.author, p.id, ...(p.topics || []), ...(p.keywords || [])]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      )
      .slice(0, 40);
  }, [plugins, q]);

  return (
    <section className="search-block">
      <label className="search-label" htmlFor="q">
        搜索目录
      </label>
      <input
        id="q"
        className="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="名称、作者、topic…"
      />
      <ul className="card-grid">
        {filtered.map((p) => (
          <li key={p.id}>
            <PluginCard plugin={p} />
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? <p className="muted">没有匹配结果。</p> : null}
    </section>
  );
}

export function PluginCard({ plugin }: { plugin: RegistryPlugin }) {
  const cat = CATEGORIES.find((c) => c.id === plugin.category);
  return (
    <Link className="card" href={`/plugin/${pluginSlug(plugin.id)}/`}>
      <div className="card-top">
        <strong>{plugin.name}</strong>
        <span className="stars">{plugin.stars}</span>
      </div>
      <p>{plugin.description || '暂无描述'}</p>
      <div className="card-meta">
        <span>{cat?.name || plugin.category}</span>
        <span>{plugin.author}</span>
        {plugin.permissionLevel && plugin.permissionLevel !== 'unknown' ? (
          <span className={`risk risk-${plugin.permissionLevel}`}>{riskLabel(plugin.permissionLevel)}</span>
        ) : null}
      </div>
    </Link>
  );
}

export function ReadmeFrame({ plugin }: { plugin: RegistryPlugin }) {
  const [excerpt, setExcerpt] = useState<{ paragraphs: string[]; more: boolean; error?: string }>({ paragraphs: ['加载说明…'], more: false });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!plugin.id.startsWith('github:')) {
        setExcerpt({ paragraphs: ['该条目没有 GitHub README。'], more: false });
        return;
      }
      const full = plugin.id.slice('github:'.length);
      const url = `https://cdn.jsdelivr.net/gh/${full}@HEAD/README.md`;
      try {
        const res = await fetch(url);
        const body = await res.text();
        if (cancelled) return;
        if (!res.ok || !body || body.startsWith("Couldn't find")) {
          setExcerpt({ paragraphs: ['未能加载 README。'], more: false });
          return;
        }
        const cleaned = body
          .replace(/^---\n[\s\S]*?\n---\n/, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .split('\n')
          .filter((line) => {
            const t = line.trim();
            if (!t) return true;
            if (t.startsWith('|')) return false;
            if (t.startsWith('[![') || t.startsWith('![') || t.startsWith('<img') || t.startsWith('<p align') || t.startsWith('<div')) return false;
            if (/^<\/?(h[1-6]|details|summary|table|thead|tbody|tr|td|th|center|p)\b/i.test(t)) return false;
            if (/^#{1,3}\s+(Install(ation)?|Getting Started|Usage|License|安装|使用|许可证)\b/i.test(t)) return false;
            return true;
          })
          .join('\n')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
          .replace(/^#{1,3}\s+/gm, '')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        const paragraphs = cleaned.split(/\n\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const shown = paragraphs.slice(0, 5);
        setExcerpt({ paragraphs: shown.length ? shown : ['README 以徽章、表格或图片为主。'], more: paragraphs.length > shown.length });
      } catch {
        if (!cancelled) setExcerpt({ paragraphs: ['未能加载 README。'], more: false });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [plugin.id]);

  return (
    <div className="readme">
      {excerpt.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      {excerpt.more ? <p className="excerpt-note">以上为摘要。</p> : null}
      {plugin.url ? <p><a href={plugin.url} rel="noreferrer">在仓库中阅读完整 README</a></p> : null}
    </div>
  );
}
