import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PluginRegistry, RegistryPlugin } from './types';
import { CATEGORIES } from './types';

export function loadRegistry(): PluginRegistry {
  const file = join(process.cwd(), 'public', 'registry.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as PluginRegistry;
  } catch {
    return { generatedAt: '', source: 'missing', total: 0, plugins: [] };
  }
}

export function categoryCounts(plugins: RegistryPlugin[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of CATEGORIES) counts[c.id] = 0;
  for (const p of plugins) {
    const id = p.category || 'other';
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

export function trending(plugins: RegistryPlugin[], limit = 12): RegistryPlugin[] {
  return [...plugins].sort((a, b) => b.stars - a.stars).slice(0, limit);
}

export function findPlugin(plugins: RegistryPlugin[], id: string): RegistryPlugin | undefined {
  return plugins.find((p) => p.id === id);
}
