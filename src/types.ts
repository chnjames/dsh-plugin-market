// ============================================================
// DSH Plugin Market - Type Definitions
// ============================================================

// ---------- 数据源 ----------
export type PluginSource = 'github' | 'npm';

// ---------- 风险级别 ----------
export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'unknown';

// ---------- 分类 ----------
export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  description?: string;
  pluginCount: number;
}

// ---------- 插件（列表项） ----------
export interface Plugin {
  id: string;                    // 唯一标识: github:owner/repo 或 npm:package-name
  source: PluginSource;
  name: string;
  description: string;
  category: string;              // 主分类 ID
  categories?: string[];         // 所有分类 ID
  author: string;
  url: string;
  stars: number;
  downloads: number;
  version: string;
  license: string;
  language: string;
  topics: string[];
  keywords: string[];
  readmeUrl?: string;
  installCmd: string;
  permissionLevel: RiskLevel; // heuristic hint only — not a permission audit
  compatibility?: string;
  updatedAt: string;             // ISO 8601
  cachedAt: string;              // ISO 8601
  isInstalled: boolean;
  installedVersion?: string;
}

// ---------- 插件详情 ----------
export interface PluginDetail extends Plugin {
  readme: string;                // README 全文或摘要
  homepage?: string;
  repository?: string;
  bugsUrl?: string;
  maintainers?: string[];
}

// ---------- 安装状态 ----------
export type InstallStatus = 'not_installed' | 'installing' | 'installed' | 'install_failed' | 'uninstalling';

// ---------- 安装结果 ----------
export interface InstallResult {
  success: boolean;
  pluginId: string;
  version?: string;
  error?: string;
  durationMs: number;
  needsConfirm?: boolean;
}

export interface UninstallResult {
  success: boolean;
  pluginId: string;
  error?: string;
  durationMs: number;
}

export interface UpdateResult {
  success: boolean;
  pluginId: string;
  fromVersion?: string;
  toVersion?: string;
  error?: string;
  durationMs: number;
}

// ---------- 已安装插件 ----------
export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  source: PluginSource;
  installedAt: string;
  profile: string;
}

// ---------- 同步结果 ----------
export interface SyncResult {
  success: boolean;
  totalPlugins: number;
  newPlugins: number;
  updatedPlugins: number;
  failedSources: string[];
  durationMs: number;
  error?: string;
}

// ---------- 缓存状态 ----------
export interface CacheStatus {
  totalPlugins: number;
  lastSyncAt?: string;
  nextSyncAt?: string;
  isStale: boolean;
  sourceStats: {
    github: { count: number; lastSync?: string };
    npm: { count: number; lastSync?: string };
  };
}

// ---------- 搜索选项 ----------
export interface SearchOptions {
  category?: string;
  sortBy?: 'stars' | 'updated' | 'name' | 'downloads';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  installedOnly?: boolean;
  riskLevel?: RiskLevel;
  source?: PluginSource;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

// ---------- 安装选项 ----------
export interface InstallOptions {
  profile?: string;
  version?: string;
  confirm?: boolean;
}

// ---------- 配置 ----------
export interface PluginMarketConfig {
  catalog: {
    urls: string[];
    fallbackToSearch: boolean;
  };
  sources: {
    github: {
      enabled: boolean;
      token?: string;
      topic: string;
    };
    npm: {
      enabled: boolean;
      keyword: string;
      registry: string;
    };
  };
  cache: {
    ttl: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  ui: {
    defaultSort: string;
    defaultView: string;
    showRiskLevel: boolean;
    webPort?: number;
  };
  install: {
    defaultProfile: string;
    autoUpdate: boolean;
    confirmBeforeInstall: boolean;
    dshCommand?: string;  // 自定义 dsh 命令，如 'npx @deepseek-ai/dsh'，留空则自动检测
  };
}

// ---------- 安装日志 ----------
export interface InstallLogEntry {
  id: number;
  pluginId: string;
  action: 'install' | 'uninstall' | 'update';
  version?: string;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  createdAt: string;
}

// ---------- 服务接口 ----------
export interface IIndexingService {
  syncAll(): Promise<SyncResult>;
  syncIncremental(): Promise<SyncResult>;
  search(query: string, options?: SearchOptions): Promise<{ plugins: Plugin[]; total: number }>;
  getByCategory(categoryId: string, options?: SearchOptions): Promise<{ plugins: Plugin[]; total: number }>;
  getTrending(limit?: number): Promise<Plugin[]>;
  getRecent(limit?: number): Promise<Plugin[]>;
  getDetail(pluginId: string): Promise<PluginDetail | null>;
  getCategories(): Promise<Category[]>;
  getCacheStatus(): Promise<CacheStatus>;
}

export interface IInstallerService {
  install(pluginId: string, options?: InstallOptions): Promise<InstallResult>;
  uninstall(pluginId: string, options?: { profile?: string }): Promise<UninstallResult>;
  update(pluginId: string, options?: { profile?: string }): Promise<UpdateResult>;
  getInstalled(): Promise<InstalledPlugin[]>;
  isInstalled(pluginId: string): Promise<boolean>;
  getStatus(pluginId: string): Promise<InstallStatus>;
}
