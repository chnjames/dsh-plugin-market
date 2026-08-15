import Link from 'next/link';
import { loadRegistry, categoryCounts, trending } from '@/lib/registry';
import { CATEGORIES } from '@/lib/types';
import { PluginCard, PluginSearch } from '@/components/PluginSearch';
import { CopyButton } from '@/components/CopyButton';

export default function HomePage() {
  const registry = loadRegistry();
  const counts = categoryCounts(registry.plugins);
  const hot = trending(registry.plugins, 8);
  const total = registry.total || registry.plugins.length;
  const selfInstall = 'dsh plugin --profile web add github:chnjames/dsh-plugin-market';

  return (
    <main>
      <section className="hero">
        <h1>DeepSeek Harness 的社区插件目录</h1>
        <p className="lede">
          浏览公开索引、复制官方安装命令。装上本市场插件后，在 DSH「设置 → 插件 → 插件市场」里确认安装。
        </p>
        <div className="cmd">
          <code>{selfInstall}</code>
          <CopyButton text={selfInstall} />
        </div>
      </section>

      <div className="meta-strip" aria-label="目录概况">
        <span><b>{total}</b>已索引插件</span>
        <span><b>{CATEGORIES.length}</b>分类</span>
        <span><b>{registry.source || '—'}</b>数据源</span>
      </div>

      <section className="section" aria-labelledby="cats-title">
        <div className="section-head">
          <h2 id="cats-title" className="section-title">分类</h2>
        </div>
        <ul className="cat-grid">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link className="cat" href={`/category/${c.id}/`}>
                <strong>{c.name}</strong>
                <span>{counts[c.id] || 0} · {c.nameEn}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="hot-title">
        <div className="section-head">
          <h2 id="hot-title" className="section-title">热门</h2>
          <span className="section-note">按 Stars</span>
        </div>
        <ul className="card-grid">
          {hot.map((p) => (
            <li key={p.id}><PluginCard plugin={p} /></li>
          ))}
        </ul>
        {hot.length === 0 ? (
          <p className="muted">目录尚未生成。运行 <code>npm run build:registry</code> 或等待 GitHub Actions。</p>
        ) : null}
      </section>

      <section className="section" aria-labelledby="search-title">
        <div className="section-head">
          <h2 id="search-title" className="section-title">搜索</h2>
        </div>
        <PluginSearch plugins={registry.plugins} />
      </section>

      <p className="install-note">
        本站不在浏览器里安装插件。把命令贴进终端，或在已运行的 DSH 里打开「插件市场」。
      </p>
    </main>
  );
}
