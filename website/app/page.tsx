import { loadRegistry, categoryCounts, trending, recentlyUpdated } from '@/lib/registry';
import { HomeView } from '@/components/HomeView';

export default function HomePage() {
  const registry = loadRegistry();
  const counts = categoryCounts(registry.plugins);
  const hot = trending(registry.plugins, 8);
  const recent = recentlyUpdated(registry.plugins, 8);
  const total = registry.total || registry.plugins.length;

  return (
    <HomeView
      total={total}
      source={registry.source || ''}
      counts={counts}
      hot={hot}
      recent={recent}
      selfInstall="dsh plugin --profile web add github:chnjames/dsh-plugin-market"
      npxBoot="npx @deepseek-ai/dsh web"
    />
  );
}
