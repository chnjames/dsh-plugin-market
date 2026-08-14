// ============================================================
// DSH Plugin Market - Indexing Service
// Catalog-first: fetch shared registry.json, then optional GitHub/npm fallback.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PluginCache } from '../db/cache.js';
import { GitHubApiClient, type GitHubRepo } from '../utils/github-api.js';
import { NpmApiClient, type NpmPackage } from '../utils/npm-api.js';
import { classifyPlugin, inferRiskLevel } from '../utils/classifier.js';
import { DEFAULT_CATALOG_URLS } from '../utils/registry.js';
import type {
  Plugin,
  PluginDetail,
  Category,
  SyncResult,
  CacheStatus,
  SearchOptions,
  IIndexingService,
  PluginMarketConfig,
} from '../types.js';
import type { PluginRegistry, RegistryPlugin } from '../utils/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class IndexingService implements IIndexingService {
  private cache: PluginCache;
  private githubClient: GitHubApiClient;
  private npmClient: NpmApiClient;
  private config: PluginMarketConfig['sources'];
  private catalogUrls: string[];
  private fallbackToSearch: boolean;
  private syncInProgress = false;

  constructor(
    cache: PluginCache,
    config: PluginMarketConfig['sources'],
    catalog?: PluginMarketConfig['catalog']
  ) {
    this.cache = cache;
    this.config = config;
    this.catalogUrls = catalog?.urls?.length ? catalog.urls : DEFAULT_CATALOG_URLS;
    this.fallbackToSearch = catalog?.fallbackToSearch !== false;
    this.githubClient = new GitHubApiClient(config.github.token);
    this.npmClient = new NpmApiClient(config.npm.registry);
  }

  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        totalPlugins: this.cache.getTotalCount(),
        newPlugins: 0,
        updatedPlugins: 0,
        failedSources: [],
        durationMs: 0,
        error: 'Sync already in progress',
      };
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    const beforeCount = this.cache.getTotalCount();
    const failedSources: string[] = [];

    try {
      const loaded = await this.loadRegistry();
      if (loaded) {
        const count = this.applyRegistry(loaded.registry);
        const syncId = this.cache.addSyncLog(loaded.source, 'running', new Date().toISOString());
        this.cache.finishSyncLog(syncId, 'success', count, new Date().toISOString());
        const afterCount = this.cache.getTotalCount();
        return {
          success: true,
          totalPlugins: afterCount,
          newPlugins: Math.max(0, afterCount - beforeCount),
          updatedPlugins: Math.max(0, Math.min(beforeCount, count)),
          failedSources,
          durationMs: Date.now() - startTime,
        };
      }

      failedSources.push('catalog');
      if (!this.fallbackToSearch) {
        return {
          success: false,
          totalPlugins: this.cache.getTotalCount(),
          newPlugins: 0,
          updatedPlugins: 0,
          failedSources,
          durationMs: Date.now() - startTime,
          error: 'Catalog unavailable',
        };
      }

      return await this.syncFromSearchApis(startTime, beforeCount, failedSources);
    } catch (error) {
      return {
        success: false,
        totalPlugins: this.cache.getTotalCount(),
        newPlugins: 0,
        updatedPlugins: 0,
        failedSources,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncIncremental(): Promise<SyncResult> {
    return this.syncAll();
  }

  private async loadRegistry(): Promise<{ registry: PluginRegistry; source: string } | null> {
    for (const url of this.catalogUrls) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'dsh-plugin-market', Accept: 'application/json' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as PluginRegistry;
        if (Array.isArray(data?.plugins) && data.plugins.length > 0) {
          return { registry: data, source: url };
        }
      } catch {
        /* try next */
      }
    }

    const snapshot = this.readLocalSnapshot();
    if (snapshot?.plugins?.length) {
      return { registry: snapshot, source: 'snapshot' };
    }
    return null;
  }

  private readLocalSnapshot(): PluginRegistry | null {
    const candidates = [
      path.join(__dirname, '..', 'registry.snapshot.json'),
      path.join(__dirname, '..', '..', 'website', 'public', 'registry.json'),
    ];
    for (const file of candidates) {
      try {
        if (!fs.existsSync(file)) continue;
        const data = JSON.parse(fs.readFileSync(file, 'utf8')) as PluginRegistry;
        if (Array.isArray(data?.plugins) && data.plugins.length > 0) return data;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  private applyRegistry(registry: PluginRegistry): number {
    const now = new Date().toISOString();
    let count = 0;
    for (const item of registry.plugins) {
      this.cache.upsertPlugin(this.registryItemToPlugin(item, now));
      count++;
    }
    return count;
  }

  private registryItemToPlugin(
    item: RegistryPlugin,
    cachedAt: string
  ): Omit<Plugin, 'isInstalled' | 'installedVersion'> {
    return {
      id: item.id,
      source: item.source,
      name: item.name,
      description: item.description || '',
      category: item.category || 'other',
      author: item.author || '',
      url: item.url || '',
      stars: Number(item.stars) || 0,
      downloads: Number(item.downloads) || 0,
      version: item.version || '',
      license: item.license || '',
      language: item.language || '',
      topics: item.topics || [],
      keywords: item.keywords || [],
      readmeUrl: item.readmeUrl,
      installCmd: item.installCmd || `dsh plugin --profile web add ${item.installSpec}`,
      permissionLevel: item.permissionLevel || 'unknown',
      updatedAt: item.updatedAt,
      cachedAt,
    };
  }

  private async syncFromSearchApis(
    startTime: number,
    beforeCount: number,
    failedSources: string[]
  ): Promise<SyncResult> {
    if (this.config.github.enabled) {
      let githubSyncId = 0;
      try {
        githubSyncId = this.cache.addSyncLog('github', 'running', new Date().toISOString());
        const count = await this.syncFromGitHub();
        this.cache.finishSyncLog(githubSyncId, 'success', count, new Date().toISOString());
      } catch (error) {
        console.error('[plugin-market] GitHub sync failed:', error);
        failedSources.push('github');
        this.cache.finishSyncLog(
          githubSyncId,
          'failed',
          0,
          new Date().toISOString(),
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    if (this.config.npm.enabled) {
      let npmSyncId = 0;
      try {
        npmSyncId = this.cache.addSyncLog('npm', 'running', new Date().toISOString());
        const count = await this.syncFromNpm();
        this.cache.finishSyncLog(npmSyncId, 'success', count, new Date().toISOString());
      } catch (error) {
        console.error('[plugin-market] npm sync failed:', error);
        failedSources.push('npm');
        this.cache.finishSyncLog(
          npmSyncId,
          'failed',
          0,
          new Date().toISOString(),
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    const afterCount = this.cache.getTotalCount();
    return {
      success: failedSources.length === 0,
      totalPlugins: afterCount,
      newPlugins: Math.max(0, afterCount - beforeCount),
      updatedPlugins: Math.max(0, afterCount - Math.max(0, afterCount - beforeCount)),
      failedSources,
      durationMs: Date.now() - startTime,
      error: failedSources.length > 0 ? `Failed sources: ${failedSources.join(', ')}` : undefined,
    };
  }

  private async syncFromGitHub(): Promise<number> {
    const repos = await this.githubClient.fetchAllRepos(this.config.github.topic);
    const now = new Date().toISOString();
    for (const repo of repos) {
      this.cache.upsertPlugin(this.githubRepoToPlugin(repo, now));
    }
    return repos.length;
  }

  private async syncFromNpm(): Promise<number> {
    const result = await this.npmClient.search(this.config.npm.keyword, 250);
    const now = new Date().toISOString();
    let count = 0;
    for (const item of result.objects) {
      const pkg = item.package;
      const githubId = this.extractGitHubIdFromNpm(pkg);
      if (githubId && this.cache.getPlugin(githubId)) continue;
      this.cache.upsertPlugin(this.npmPackageToPlugin(pkg, now));
      count++;
    }
    return count;
  }

  private githubRepoToPlugin(repo: GitHubRepo, cachedAt: string): Omit<Plugin, 'isInstalled' | 'installedVersion'> {
    const name = repo.name;
    const description = repo.description || '';
    const topics = repo.topics || [];
    const keywords: string[] = [];
    const category = classifyPlugin({ name, description, topics, keywords });
    const permissionLevel = inferRiskLevel({ name, description, topics, keywords });
    const pluginId = `github:${repo.full_name}`;
    return {
      id: pluginId,
      source: 'github',
      name,
      description,
      category,
      author: repo.owner.login,
      url: repo.html_url,
      stars: repo.stargazers_count,
      downloads: 0,
      version: repo.default_branch,
      license: repo.license?.spdx_id || repo.license?.name || '',
      language: repo.language || '',
      topics,
      keywords,
      readmeUrl: `https://github.com/${repo.full_name}/blob/${repo.default_branch}/README.md`,
      installCmd: `dsh plugin --profile web add github:${repo.full_name}`,
      permissionLevel,
      updatedAt: repo.updated_at,
      cachedAt,
    };
  }

  private npmPackageToPlugin(pkg: NpmPackage, cachedAt: string): Omit<Plugin, 'isInstalled' | 'installedVersion'> {
    const name = pkg.name;
    const description = pkg.description || '';
    const keywords = pkg.keywords || [];
    const topics: string[] = [];
    const category = classifyPlugin({ name, description, topics, keywords });
    const permissionLevel = inferRiskLevel({ name, description, topics, keywords });
    return {
      id: `npm:${pkg.name}`,
      source: 'npm',
      name,
      description,
      category,
      author: pkg.author?.name || pkg.publisher?.username || '',
      url: pkg.links.homepage || pkg.links.npm || pkg.links.repository || '',
      stars: 0,
      downloads: 0,
      version: pkg.version,
      license: pkg.license || '',
      language: 'TypeScript',
      topics,
      keywords,
      readmeUrl: pkg.links.repository || '',
      installCmd: `dsh plugin --profile web add ${pkg.name}`,
      permissionLevel,
      updatedAt: pkg.date,
      cachedAt,
    };
  }

  private extractGitHubIdFromNpm(pkg: NpmPackage): string | null {
    const repoUrl = pkg.links.repository;
    if (!repoUrl) return null;
    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) return `github:${match[1]}/${match[2]}`;
    return null;
  }

  async search(query: string, options?: SearchOptions): Promise<{ plugins: Plugin[]; total: number }> {
    return this.cache.searchPlugins(query, options || {});
  }

  async getByCategory(categoryId: string, options?: SearchOptions): Promise<{ plugins: Plugin[]; total: number }> {
    return this.cache.searchPlugins('', { ...options, category: categoryId });
  }

  async getTrending(limit: number = 20): Promise<Plugin[]> {
    return this.cache.getTrendingPlugins(limit);
  }

  async getRecent(limit: number = 20): Promise<Plugin[]> {
    return this.cache.getRecentPlugins(limit);
  }

  async getDetail(pluginId: string): Promise<PluginDetail | null> {
    const detail = this.cache.getPluginDetail(pluginId);
    if (detail && !detail.readme) {
      try {
        const readme = await this.fetchReadme(pluginId);
        if (readme) {
          this.cache.updatePluginReadme(pluginId, readme);
          return { ...detail, readme };
        }
      } catch (error) {
        console.error('[plugin-market] Failed to fetch README:', error);
      }
    }
    return detail;
  }

  private async fetchReadme(pluginId: string): Promise<string | null> {
    if (pluginId.startsWith('github:')) {
      const fullName = pluginId.slice('github:'.length);
      const [owner, repo] = fullName.split('/');
      if (!owner || !repo) return null;
      const cdn = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@HEAD/README.md`;
      try {
        const res = await fetch(cdn, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const text = await res.text();
          if (text && !text.startsWith("Couldn't find")) return text.slice(0, 20000);
        }
      } catch {
        /* fall through */
      }
      const gh = await this.githubClient.getReadme(owner, repo);
      return gh ? gh.slice(0, 20000) : null;
    }
    if (pluginId.startsWith('npm:')) {
      const npm = await this.npmClient.getReadme(pluginId.slice('npm:'.length));
      return npm ? npm.slice(0, 20000) : null;
    }
    return null;
  }

  async getCategories(): Promise<Category[]> {
    return this.cache.getCategories();
  }

  async getCacheStatus(): Promise<CacheStatus> {
    return this.cache.getCacheStatus();
  }
}
