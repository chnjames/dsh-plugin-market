// ============================================================
// DSH Plugin Market - Indexing Service
// ============================================================

import { PluginCache } from '../db/cache.js';
import { GitHubApiClient, type GitHubRepo } from '../utils/github-api.js';
import { NpmApiClient, type NpmPackage } from '../utils/npm-api.js';
import { classifyPlugin, inferRiskLevel } from '../utils/classifier.js';
import type {
  Plugin,
  PluginDetail,
  Category,
  SyncResult,
  CacheStatus,
  SearchOptions,
  IIndexingService,
  PluginSource,
} from '../types.js';

export class IndexingService implements IIndexingService {
  private cache: PluginCache;
  private githubClient: GitHubApiClient;
  private npmClient: NpmApiClient;
  private config: {
    github: { enabled: boolean; topic: string; token?: string };
    npm: { enabled: boolean; keyword: string; registry: string };
  };
  private syncInProgress = false;

  constructor(
    cache: PluginCache,
    config: {
      github: { enabled: boolean; topic: string; token?: string };
      npm: { enabled: boolean; keyword: string; registry: string };
    }
  ) {
    this.cache = cache;
    this.config = config;
    this.githubClient = new GitHubApiClient(config.github.token);
    this.npmClient = new NpmApiClient(config.npm.registry);
  }

  /**
   * 全量同步所有插件
   */
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
    const failedSources: string[] = [];
    let newPlugins = 0;
    let updatedPlugins = 0;

    const beforeCount = this.cache.getTotalCount();

    // 同步 GitHub
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

    // 同步 npm
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
    newPlugins = Math.max(0, afterCount - beforeCount);
    // 粗略估算更新数
    updatedPlugins = Math.max(0, afterCount - newPlugins);

    this.syncInProgress = false;

    return {
      success: failedSources.length === 0,
      totalPlugins: afterCount,
      newPlugins,
      updatedPlugins,
      failedSources,
      durationMs: Date.now() - startTime,
      error: failedSources.length > 0 ? `Failed sources: ${failedSources.join(', ')}` : undefined,
    };
  }

  /**
   * 增量同步（目前简化为全量同步，后续可优化）
   */
  async syncIncremental(): Promise<SyncResult> {
    return this.syncAll();
  }

  /**
   * 从 GitHub 同步
   */
  private async syncFromGitHub(): Promise<number> {
    const repos = await this.githubClient.fetchAllRepos(this.config.github.topic);
    const now = new Date().toISOString();

    for (const repo of repos) {
      const plugin = this.githubRepoToPlugin(repo, now);
      this.cache.upsertPlugin(plugin);
    }

    return repos.length;
  }

  /**
   * 从 npm 同步
   */
  private async syncFromNpm(): Promise<number> {
    const result = await this.npmClient.search(this.config.npm.keyword, 250);
    const now = new Date().toISOString();
    let count = 0;

    for (const item of result.objects) {
      const pkg = item.package;
      // 跳过 GitHub 上已有的（避免重复）
      const githubId = this.extractGitHubIdFromNpm(pkg);
      if (githubId) {
        const existing = this.cache.getPlugin(githubId);
        if (existing) {
          // 更新 npm 下载量信息
          continue;
        }
      }

      const plugin = this.npmPackageToPlugin(pkg, now);
      this.cache.upsertPlugin(plugin);
      count++;
    }

    return count;
  }

  /**
   * GitHub 仓库转插件对象
   */
  private githubRepoToPlugin(repo: GitHubRepo, cachedAt: string): Omit<Plugin, 'isInstalled' | 'installedVersion'> {
    const name = repo.name;
    const description = repo.description || '';
    const topics = repo.topics || [];
    const keywords: string[] = [];

    const category = classifyPlugin({ name, description, topics, keywords });
    const permissionLevel = inferRiskLevel({ name, description, topics, keywords });

    const pluginId = `github:${repo.full_name}`;
    const installCmd = `dsh plugin --profile web add github:${repo.full_name}`;

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
      installCmd,
      permissionLevel,
      updatedAt: repo.updated_at,
      cachedAt,
    };
  }

  /**
   * npm 包转插件对象
   */
  private npmPackageToPlugin(pkg: NpmPackage, cachedAt: string): Omit<Plugin, 'isInstalled' | 'installedVersion'> {
    const name = pkg.name;
    const description = pkg.description || '';
    const keywords = pkg.keywords || [];
    const topics: string[] = [];

    const category = classifyPlugin({ name, description, topics, keywords });
    const permissionLevel = inferRiskLevel({ name, description, topics, keywords });

    const pluginId = `npm:${pkg.name}`;
    const installCmd = `dsh plugin --profile web add ${pkg.name}`;

    return {
      id: pluginId,
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
      installCmd,
      permissionLevel,
      updatedAt: pkg.date,
      cachedAt,
    };
  }

  /**
   * 从 npm 包信息中提取 GitHub ID
   */
  private extractGitHubIdFromNpm(pkg: NpmPackage): string | null {
    const repoUrl = pkg.links.repository;
    if (!repoUrl) return null;

    const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return `github:${match[1]}/${match[2]}`;
    }
    return null;
  }

  // ---------- 查询接口 ----------

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

    // 如果没有 README，尝试拉取
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

  /**
   * 拉取插件 README
   */
  private async fetchReadme(pluginId: string): Promise<string | null> {
    if (pluginId.startsWith('github:')) {
      const fullName = pluginId.slice('github:'.length);
      const [owner, repo] = fullName.split('/');
      if (owner && repo) {
        return this.githubClient.getReadme(owner, repo);
      }
    } else if (pluginId.startsWith('npm:')) {
      const pkgName = pluginId.slice('npm:'.length);
      return this.npmClient.getReadme(pkgName);
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
