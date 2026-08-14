// ============================================================
// DSH Plugin Market - Main Entry (DSH-runtime adapted)
// ============================================================
// Adapted to the real DeepSeek Harness runtime:
//  - plugin shape: named exports { apply, inject, name } (no default),
//    inject: ['tools'] so ctx.tools resolves on the host plane
//  - ctx.provide() instead of the legacy ctx.service()
//  - lifecycle runs directly in apply(); cleanup via ctx.effect()
//  - tools registered with the full ToolDefinition contract
//    (name/description/parameters/output/execute)

import path from 'node:path';
import os from 'node:os';
import { PluginCache } from './db/cache.js';
import { IndexingService } from './services/indexing.js';
import { InstallerService } from './services/installer.js';
import { PluginMarketWebServer } from './ui/web-server.js';
import type { PluginMarketConfig } from './types.js';

/** Cordis plugin name used by loader diagnostics. */
const name = 'plugin-market';

/** Services required by this plugin. */
const inject = ['tools'];

const DEFAULT_CONFIG: PluginMarketConfig = {
  sources: {
    github: {
      enabled: true,
      topic: 'dsh-plugin',
    },
    npm: {
      enabled: true,
      keyword: 'dsh-plugin',
      registry: 'https://registry.npmjs.org',
    },
  },
  cache: {
    ttl: 21600,
    autoRefresh: true,
    refreshInterval: 21600,
  },
  ui: {
    defaultSort: 'stars',
    defaultView: 'grid',
    showRiskLevel: true,
  },
  install: {
    defaultProfile: 'web',
    autoUpdate: false,
    confirmBeforeInstall: true,
  },
};

/**
 * DSH 插件市场插件入口（适配 DSH 运行时）
 *
 * 提供：
 * - 插件索引服务（从 GitHub/npm 拉取插件元数据）
 * - 插件安装服务（调用 dsh plugin CLI）
 * - 本地缓存（SQLite）
 * - HTTP API 端点（供前端 UI 调用）
 * - Web UI 面板（独立端口）
 * - Agent 工具（plugin_market_*）
 */
async function apply(ctx: any, config: Partial<PluginMarketConfig>) {
  // 合并配置
  const mergedConfig: PluginMarketConfig = deepMerge(DEFAULT_CONFIG, config) as PluginMarketConfig;

  // 确定缓存数据库路径
  const dbDir = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const dbPath = path.join(dbDir, 'plugin-market.db');

  // 初始化各层
  const cache = new PluginCache(dbPath);
  const indexing = new IndexingService(cache, mergedConfig.sources);
  const installer = new InstallerService(
    cache,
    mergedConfig.install.dshCommand,
    mergedConfig.install.defaultProfile
  );

  // ---------- 服务注册 ----------
  // 通过 ctx.provide 向 Cordis 容器注册服务，供其他插件调用
  ctx.provide('pluginMarket', {
    indexing: {
      syncAll: () => indexing.syncAll(),
      syncIncremental: () => indexing.syncIncremental(),
      search: (q: string, opts?: any) => indexing.search(q, opts),
      getByCategory: (id: string, opts?: any) => indexing.getByCategory(id, opts),
      getTrending: (limit?: number) => indexing.getTrending(limit),
      getRecent: (limit?: number) => indexing.getRecent(limit),
      getDetail: (id: string) => indexing.getDetail(id),
      getCategories: () => indexing.getCategories(),
      getCacheStatus: () => indexing.getCacheStatus(),
    },
    installer: {
      install: (id: string, opts?: any) => installer.install(id, opts),
      uninstall: (id: string, opts?: any) => installer.uninstall(id, opts),
      update: (id: string, opts?: any) => installer.update(id, opts),
      getInstalled: () => installer.getInstalled(),
      isInstalled: (id: string) => installer.isInstalled(id),
      getStatus: (id: string) => installer.getStatus(id),
    },
    config: mergedConfig,
  });

  // ---------- 工具注册 ----------
  // DSH ToolDefinition: name/description/parameters + mandatory output + execute(args, exec)
  const toolDisposers: Array<() => void> = [];
  try {
    for (const tool of buildTools(indexing, installer)) {
      toolDisposers.push(ctx.tools.register(tool));
    }
  } catch (error) {
    ctx.logger.warn('[plugin-market] Failed to register tools:', error);
  }

  // ---------- 生命周期 ----------
  let refreshTimer: ReturnType<typeof setInterval> | undefined;
  let webServer: PluginMarketWebServer | undefined;

  // 启动时初始化数据库并后台同步插件索引
  try {
    await cache.ready();
    ctx.logger.info('[plugin-market] Database initialized');

    const status = await indexing.getCacheStatus();
    ctx.logger.info(`[plugin-market] Cache: ${status.totalPlugins} plugins, stale=${status.isStale}`);

    // 如果缓存为空或已过期，启动后台同步
    if (status.isStale || status.totalPlugins === 0) {
      ctx.logger.info('[plugin-market] Starting background sync...');
      indexing.syncAll().then((result) => {
        ctx.logger.info(
          `[plugin-market] Sync complete: ${result.totalPlugins} plugins ` +
          `(${result.newPlugins} new, ${result.updatedPlugins} updated)`
        );
        if (result.failedSources.length > 0) {
          ctx.logger.warn(`[plugin-market] Failed sources: ${result.failedSources.join(', ')}`);
        }
      }).catch((err) => {
        ctx.logger.error('[plugin-market] Sync failed:', err);
      });
    }

    // 设置定时刷新
    if (mergedConfig.cache.autoRefresh) {
      const intervalMs = mergedConfig.cache.refreshInterval * 1000;
      refreshTimer = setInterval(() => {
        ctx.logger.info('[plugin-market] Running scheduled refresh...');
        indexing.syncAll().catch((err: any) => {
          ctx.logger.error('[plugin-market] Scheduled refresh failed:', err);
        });
      }, intervalMs);
    }

    // 启动 Web UI 服务器（如果配置了端口）
    const webPort = (mergedConfig as any).ui?.webPort;
    if (webPort) {
      webServer = new PluginMarketWebServer({
        port: webPort,
        config: mergedConfig,
        cache,
        indexing,
        installer,
      });
      await webServer.start();
      ctx.logger.info(`[plugin-market] Web UI server started on port ${webPort}`);
    }
  } catch (error) {
    ctx.logger.error('[plugin-market] Startup failed:', error);
  }

  // 清理：fiber dispose 时释放所有资源
  ctx.effect(() => {
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
      for (const dispose of toolDisposers) {
        try { dispose(); } catch { /* ignore */ }
      }
      try { if (webServer) void webServer.stop(); } catch { /* ignore */ }
      try { cache.close(); } catch { /* ignore */ }
      ctx.logger.info('[plugin-market] Shutting down');
    };
  }, 'plugin-market.cleanup');
}

// ---------- 工具定义 ----------

/** 统一的文本渲染：把 execute 返回的规范 JSON 值转成模型可见文本 */
function renderJson(_args: unknown, value: unknown): any[] {
  return [{ type: 'text', text: JSON.stringify(value, null, 2) }];
}

/** 宽松输出 schema（execute 返回结构化的 JSON 值） */
const looseObjectOutput = {
  schema: { type: 'object' },
  render: renderJson,
};

function buildTools(indexing: IndexingService, installer: InstallerService): any[] {
  return [
    {
      name: 'plugin_market_search',
      description: '搜索 DSH 插件市场中的插件。可以按关键词、分类、热度搜索。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          category: {
            type: 'string',
            description: '分类筛选：tools/web-ui/workflow/session/skills/vision/provider/integration/developer/productivity/entertainment/other',
          },
          sortBy: { type: 'string', description: '排序方式：stars(热度) / updated(更新时间) / name(名称)', default: 'stars' },
          limit: { type: 'number', description: '返回数量，默认 20', default: 20 },
        },
      },
      output: looseObjectOutput,
      execute: async (args: any) => {
        const result = await indexing.search(args.query || '', {
          category: args.category,
          sortBy: args.sortBy || 'stars',
          pageSize: args.limit || 20,
        });
        return {
          total: result.total,
          plugins: result.plugins.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            stars: p.stars,
            author: p.author,
            category: p.category,
            isInstalled: p.isInstalled,
            url: p.url,
          })),
        };
      },
    },
    {
      name: 'plugin_market_install',
      description: '安装一个 DSH 插件。需要用户确认后才能执行。',
      parameters: {
        type: 'object',
        properties: {
          pluginId: { type: 'string', description: '插件 ID，格式为 github:owner/repo 或 npm:package-name' },
        },
        required: ['pluginId'],
      },
      output: looseObjectOutput,
      execute: async (args: any) => {
        const result = await installer.install(args.pluginId);
        return result;
      },
    },
    {
      name: 'plugin_market_list_installed',
      description: '列出当前已安装的所有 DSH 插件。',
      parameters: {
        type: 'object',
        properties: {},
      },
      output: looseObjectOutput,
      execute: async () => {
        const installed = await installer.getInstalled();
        return { plugins: installed };
      },
    },
    {
      name: 'plugin_market_detail',
      description: '查看插件的详细信息，包括 README、作者、版本、许可证等。',
      parameters: {
        type: 'object',
        properties: {
          pluginId: { type: 'string', description: '插件 ID，格式为 github:owner/repo 或 npm:package-name' },
        },
        required: ['pluginId'],
      },
      output: looseObjectOutput,
      execute: async (args: any) => {
        const detail = await indexing.getDetail(args.pluginId);
        if (!detail) {
          return { error: 'Plugin not found' };
        }
        return {
          id: detail.id,
          name: detail.name,
          description: detail.description,
          author: detail.author,
          version: detail.version,
          license: detail.license,
          stars: detail.stars,
          category: detail.category,
          permissionLevel: detail.permissionLevel,
          url: detail.url,
          readme: detail.readme?.slice(0, 3000) || '暂无 README',
          isInstalled: detail.isInstalled,
        };
      },
    },
  ];
}

// ---------- 工具函数 ----------

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export { apply, inject, name };
