/** Stable on-wire schema for website/public/registry.json (CI + Vercel + DSH plugin). */

export type RegistrySource = 'github' | 'npm';
export type RegistryRisk = 'safe' | 'low' | 'medium' | 'high' | 'unknown';

export interface RegistryPlugin {
  id: string;
  source: RegistrySource;
  name: string;
  description: string;
  category: string;
  author: string;
  url: string;
  stars: number;
  downloads: number;
  version: string;
  license: string;
  language: string;
  topics: string[];
  keywords: string[];
  installSpec: string;
  installCmd: string;
  permissionLevel: RegistryRisk;
  updatedAt: string;
  readmeUrl?: string;
}

export interface PluginRegistry {
  generatedAt: string;
  source: string;
  total: number;
  plugins: RegistryPlugin[];
}

export const EXCLUDED_REPOS = new Set([
  'deepseek-ai/deepseek-harness',
]);

export const DEFAULT_CATALOG_URLS = [
  'https://dsh-plugin-market.vercel.app/registry.json',
  'https://cdn.jsdelivr.net/gh/chnjames/dsh-plugin-market@main/website/public/registry.json',
  'https://raw.githubusercontent.com/chnjames/dsh-plugin-market/main/website/public/registry.json',
];
