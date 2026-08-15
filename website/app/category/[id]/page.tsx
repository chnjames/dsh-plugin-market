import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/types';
import { loadRegistry, categoryCounts } from '@/lib/registry';
import { PluginCard } from '@/components/PluginSearch';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = CATEGORIES.find((c) => c.id === id);
  return { title: cat ? cat.name : '分类' };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = CATEGORIES.find((c) => c.id === id);
  if (!cat) notFound();
  const registry = loadRegistry();
  const plugins = registry.plugins.filter((p) => (p.category || 'other') === cat.id);
  const counts = categoryCounts(registry.plugins);

  return (
    <main>
      <p className="crumb">
        <Link href="/">目录</Link> / {cat.nameEn}
      </p>
      <h1 className="page-title">{cat.name}</h1>
      <p className="lede">{counts[cat.id] || 0} 个插件</p>
      <ul className="card-grid">
        {plugins.map((p) => (
          <li key={p.id}><PluginCard plugin={p} /></li>
        ))}
      </ul>
      {plugins.length === 0 ? <p className="muted">这个分类暂时是空的。</p> : null}
    </main>
  );
}
