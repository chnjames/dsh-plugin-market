import Link from 'next/link';
import { loadRegistry, categoryCounts, trending } from '@/lib/registry';
import { CATEGORIES } from '@/lib/types';
import { PluginCard, PluginSearch } from '@/components/PluginSearch';
import { CopyButton } from '@/components/CopyButton';

export default function HomePage() {
  const registry = loadRegistry();
  const counts = categoryCounts(registry.plugins);
  const hot = trending(registry.plugins, 8);
  const selfInstall = 'dsh plugin --profile web add github:chnjames/dsh-plugin-market';

  return (
    <main>
      <section className="hero">
        <h1>给 DeepSeek Harness 用的插件目录。</h1>
        <p className="lede">
          浏览社区插件、复制官方安装命令。装上本市场插件后，在 DSH「设置 → 插件 → 插件市场」里一键安装。
        </p>
        <div className="cmd">
          <code>{selfInstall}</code>
          <CopyButton text={selfInstall} />
        </div>
        <div className="stats">
          <div className="stat"><b>{registry.total || registry.plugins.length}</b><span>已索引插件</span></div>
          <div className="stat"><b>{CATEGORIES.length}</b><span>分类</span></div>
          <div className="stat"><b>{registry.source || '—'}</b><span>数据源</span></div>
        </div>
      </section>

      <h2 className="section-title">分类</h2>
      <ul className="cat-grid">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link className="cat" href={`/category/${c.id}/`}>
              {c.name}
              <span>{counts[c.id] || 0} · {c.nameEn}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="section-title">热门</h2>
      <ul className="card-grid">
        {hot.map((p) => (
          <li key={p.id}><PluginCard plugin={p} /></li>
        ))}
      </ul>
      {hot.length === 0 ? <p className="muted">目录尚未生成。运行 <code>npm run build:registry</code> 或等待 GitHub Actions。</p> : null}

      <PluginSearch plugins={registry.plugins} />

      <p className="install-note">
        本站不在浏览器里安装插件。把上面的命令贴进终端，或在已运行的 DSH Web UI 里打开「插件市场」。
      </p>
    </main>
  );
}
