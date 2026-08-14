import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadRegistry, findPlugin } from '@/lib/registry';
import { CATEGORIES, installCommand, pluginSlug, pluginIdFromSlug, riskLabel } from '@/lib/types';
import { CopyButton } from '@/components/CopyButton';
import { ReadmeFrame } from '@/components/PluginSearch';

export function generateStaticParams() {
  const registry = loadRegistry();
  return registry.plugins.map((p) => ({ id: pluginSlug(p.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plugin = findPlugin(loadRegistry().plugins, pluginIdFromSlug(id));
  return { title: plugin?.name || '插件' };
}

export default async function PluginPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plugin = findPlugin(loadRegistry().plugins, pluginIdFromSlug(id));
  if (!plugin) notFound();
  const cat = CATEGORIES.find((c) => c.id === plugin.category);
  const cmd = installCommand(plugin);

  return (
    <main>
      <p className="muted">
        <Link href="/">目录</Link>
        {cat ? <> / <Link href={`/category/${cat.id}/`}>{cat.name}</Link></> : null}
      </p>
      <h1 className="section-title" style={{ marginTop: 8 }}>{plugin.name}</h1>
      <p className="lede">{plugin.description || '暂无描述'}</p>

      <div className="cmd">
        <code>{cmd}</code>
        <CopyButton text={cmd} />
      </div>

      <dl className="meta-grid">
        <dt>作者</dt><dd>{plugin.author || '—'}</dd>
        <dt>Stars</dt><dd>{plugin.stars}</dd>
        <dt>许可证</dt><dd>{plugin.license || '—'}</dd>
        {plugin.permissionLevel && plugin.permissionLevel !== 'unknown' ? (
          <>
            <dt>提示</dt>
            <dd className={`risk-${plugin.permissionLevel}`}>{riskLabel(plugin.permissionLevel)}</dd>
          </>
        ) : null}
        <dt>来源</dt><dd><a href={plugin.url} rel="noreferrer">{plugin.url}</a></dd>
        <dt>更新</dt><dd>{plugin.updatedAt ? new Date(plugin.updatedAt).toLocaleDateString('zh-CN') : '—'}</dd>
      </dl>

      <h2 className="section-title">说明</h2>
      <ReadmeFrame plugin={plugin} />
    </main>
  );
}
