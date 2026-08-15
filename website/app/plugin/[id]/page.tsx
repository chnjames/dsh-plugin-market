import { notFound } from 'next/navigation';
import { loadRegistry, findPlugin } from '@/lib/registry';
import { installCommand, pluginSlug, pluginIdFromSlug } from '@/lib/types';
import { PluginView } from '@/components/PluginView';

export function generateStaticParams() {
  const registry = loadRegistry();
  return registry.plugins.map((p) => ({ id: pluginSlug(p.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plugin = findPlugin(loadRegistry().plugins, pluginIdFromSlug(id));
  return { title: plugin?.name || 'Plugin' };
}

export default async function PluginPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plugin = findPlugin(loadRegistry().plugins, pluginIdFromSlug(id));
  if (!plugin) notFound();

  return (
    <PluginView
      plugin={plugin}
      catId={plugin.category || undefined}
      installCmd={installCommand(plugin)}
    />
  );
}
