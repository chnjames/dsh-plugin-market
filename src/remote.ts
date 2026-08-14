// ============================================================
// DSH Plugin Market - Remote Service (client-facing API)
// ============================================================
// Exposes the plugin-market domain to the DSH browser client through the
// Typert Gateway: the browser half calls `ctx.remote.pluginMarket.<method>()`
// and every call lands on the matching `@Remote` method here.
//
// This class IS the `pluginMarket` Cordis service (extends TypertRemoteService,
// which extends cordis Service and auto-registers under the service key).
// The legacy `ctx.provide('pluginMarket', {...})` object is replaced by this
// class instance so the Gateway can route browser calls to it.

import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { IndexingService } from './services/indexing.js';
import { InstallerService } from './services/installer.js';
import type { PluginMarketConfig, PluginSource, RiskLevel } from './types.js';

/** Wire-safe scalar projection of one plugin list item. */
export interface PluginListItem {
  id: string;
  source: string;
  name: string;
  description: string;
  category: string;
  author: string;
  url: string;
  stars: number;
  downloads: number;
  version: string;
  license: string;
  permissionLevel: string;
  isInstalled: boolean;
}

/** Wire-safe scalar projection of one plugin detail. */
export interface PluginDetailItem extends PluginListItem {
  readme: string;
  homepage?: string;
  repository?: string;
}

/** Search request accepted from the browser client. */
export interface MarketSearchRequest {
  query?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  installedOnly?: boolean;
  riskLevel?: string;
  source?: string;
}

/** Search response: scalar list + total. */
export interface MarketSearchResponse {
  plugins: PluginListItem[];
  total: number;
}

/** Install/uninstall/update request. */
export interface PluginActionRequest {
  pluginId: string;
  profile?: string;
  confirm?: boolean;
}

/**
 * The plugin-market Remote service. Instantiated inside the plugin entry and
 * registered under the `pluginMarket` Cordis service key. Every public method
 * marked with `@Remote` is callable from the browser via `ctx.remote.pluginMarket`.
 */
export class PluginMarketService extends TypertRemoteService {
  static inject = ['tools'];

  private indexing: IndexingService;
  private installer: InstallerService;
  private config: PluginMarketConfig;

  constructor(
    ctx: any,
    config: PluginMarketConfig,
    indexing: IndexingService,
    installer: InstallerService
  ) {
    super(ctx, 'pluginMarket');
    this.config = config;
    this.indexing = indexing;
    this.installer = installer;
  }

  /** Drop `undefined` / non-JSON values so Gateway SRC `assertJsonValue` accepts the result. */
  private toWire<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  /** Project one cached Plugin into its wire-safe list shape. */
  private toListItem(p: any): PluginListItem {
    return {
      id: p.id,
      source: p.source,
      name: p.name,
      description: p.description || '',
      category: p.category || 'other',
      author: p.author || '',
      url: p.url || '',
      stars: Number(p.stars) || 0,
      downloads: Number(p.downloads) || 0,
      version: p.version || '',
      license: p.license || '',
      permissionLevel: p.permissionLevel || 'unknown',
      isInstalled: !!p.isInstalled,
    };
  }

  /** Wire-safe snapshot of the current cache status. */
  private statusSnapshot(): Promise<any> {
    return this.indexing.getCacheStatus().then((s: any) => ({
      totalPlugins: s.totalPlugins,
      lastSyncAt: s.lastSyncAt ?? null,
      isStale: s.isStale,
      sourceStats: {
        github: {
          count: s.sourceStats?.github?.count ?? 0,
          lastSync: s.sourceStats?.github?.lastSync ?? null,
        },
        npm: {
          count: s.sourceStats?.npm?.count ?? 0,
          lastSync: s.sourceStats?.npm?.lastSync ?? null,
        },
      },
    }));
  }

  // ---------- indexing ----------

  @Remote('search')
  async search(request?: MarketSearchRequest): Promise<MarketSearchResponse> {
    // SRC gateway parses Function.toString(); no default params / destructuring.
    const req = request || {};
    const sortBy = (req.sortBy === 'stars' || req.sortBy === 'updated' ||
      req.sortBy === 'name' || req.sortBy === 'downloads') ? req.sortBy : 'stars';
    const result = await this.indexing.search(req.query || '', {
      category: req.category,
      sortBy,
      sortOrder: req.sortOrder,
      page: req.page,
      pageSize: req.pageSize || 50,
      installedOnly: req.installedOnly,
      riskLevel: req.riskLevel as RiskLevel | undefined,
      source: req.source as PluginSource | undefined,
    });
    return this.toWire({
      plugins: result.plugins.map((p) => this.toListItem(p)),
      total: result.total,
    });
  }

  @Remote('detail')
  async detail(request: { pluginId: string }): Promise<PluginDetailItem | null> {
    const d = await this.indexing.getDetail(request.pluginId);
    if (!d) return null;
    return this.toWire({
      ...this.toListItem(d),
      readme: (d.readme || '').slice(0, 12000),
      homepage: d.homepage,
      repository: d.repository,
    });
  }

  @Remote('categories')
  async categories(): Promise<Array<{ id: string; name: string; nameEn?: string; icon?: string; pluginCount: number }>> {
    return this.toWire(await this.indexing.getCategories());
  }

  @Remote('trending')
  async trending(request?: { limit?: number }): Promise<PluginListItem[]> {
    const items = await this.indexing.getTrending((request && request.limit) || 20);
    return this.toWire(items.map((p) => this.toListItem(p)));
  }

  @Remote('recent')
  async recent(request?: { limit?: number }): Promise<PluginListItem[]> {
    const items = await this.indexing.getRecent((request && request.limit) || 20);
    return this.toWire(items.map((p) => this.toListItem(p)));
  }

  @Remote('status')
  async status(): Promise<any> {
    return this.toWire(await this.statusSnapshot());
  }

  @Remote('sync')
  async sync(): Promise<any> {
    const result = await this.indexing.syncAll();
    return this.toWire({
      success: result.success,
      totalPlugins: result.totalPlugins,
      newPlugins: result.newPlugins,
      updatedPlugins: result.updatedPlugins,
      failedSources: result.failedSources,
      durationMs: result.durationMs,
      error: result.error ?? null,
    });
  }

  // ---------- installer ----------

  // Wire name cannot be `install`: Client RemoteNamespaceService already has install().
  @Remote('installPlugin')
  async installPlugin(request: PluginActionRequest): Promise<any> {
    const result = await this.installer.install(request.pluginId, {
      profile: request.profile,
      confirm: request.confirm,
    });
    return this.toWire(result);
  }

  @Remote('uninstall')
  async uninstall(request: PluginActionRequest): Promise<any> {
    const result = await this.installer.uninstall(request.pluginId, { profile: request.profile });
    return this.toWire(result);
  }

  @Remote('update')
  async update(request: PluginActionRequest): Promise<any> {
    const result = await this.installer.update(request.pluginId, { profile: request.profile });
    return this.toWire(result);
  }

  @Remote('installed')
  async installed(): Promise<Array<{ id: string; name: string; version: string; source: string; profile: string }>> {
    return this.toWire(await this.installer.getInstalled());
  }

  @Remote('statusOf')
  async statusOf(request: { pluginId: string }): Promise<string> {
    return this.installer.getStatus(request.pluginId);
  }
}
