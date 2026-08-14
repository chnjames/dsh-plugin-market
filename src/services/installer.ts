// ============================================================
// DSH Plugin Market - Installer Service
// ============================================================

import { PluginCache } from '../db/cache.js';
import { DshCliClient } from '../utils/dsh-cli.js';
import type {
  InstallResult,
  UninstallResult,
  UpdateResult,
  InstalledPlugin,
  InstallStatus,
  InstallOptions,
  IInstallerService,
} from '../types.js';

export class InstallerService implements IInstallerService {
  private cache: PluginCache;
  private dshClient: DshCliClient;
  private defaultProfile: string;
  private installingPlugins: Map<string, Promise<InstallResult>> = new Map();
  private autoDetectPromise: Promise<boolean> | null = null;

  constructor(cache: PluginCache, dshCommand?: string, defaultProfile: string = 'web') {
    this.cache = cache;
    this.dshClient = new DshCliClient(dshCommand);
    this.defaultProfile = defaultProfile;
  }

  /**
   * 自动检测 dsh 命令（全局 dsh 或 npx）
   * 如果用户已显式指定 dshCommand，则跳过检测
   */
  async ensureDshAvailable(): Promise<boolean> {
    // 如果已经指定了命令，直接检查可用性
    if (this.dshClient['dshCommand'] !== 'dsh' || this.dshClient['useNpx']) {
      return this.dshClient.isAvailable();
    }

    // 否则执行自动检测（只检测一次）
    if (!this.autoDetectPromise) {
      this.autoDetectPromise = this.dshClient.autoDetect();
    }
    return this.autoDetectPromise;
  }

  /**
   * 安装插件
   */
  async install(pluginId: string, options?: InstallOptions): Promise<InstallResult> {
    const profile = options?.profile || this.defaultProfile;

    // 确保 dsh 命令可用
    const dshAvailable = await this.ensureDshAvailable();
    if (!dshAvailable) {
      return {
        success: false,
        pluginId,
        error: 'dsh 命令不可用，请检查 DSH 是否已安装。如果使用 npx，请在配置中设置 install.dshCommand: "npx @deepseek-ai/dsh"',
        durationMs: 0,
      };
    }

    // 防重复安装
    if (this.installingPlugins.has(pluginId)) {
      return this.installingPlugins.get(pluginId)!;
    }

    const plugin = this.cache.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        pluginId,
        error: 'Plugin not found in cache',
        durationMs: 0,
      };
    }

    // 从插件信息中提取安装命令
    const installSpec = this.extractInstallSpec(plugin);
    if (!installSpec) {
      return {
        success: false,
        pluginId,
        error: 'Could not determine install spec',
        durationMs: 0,
      };
    }

    const logId = this.cache.addInstallLog({
      pluginId,
      action: 'install',
      version: plugin.version,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const installPromise = (async () => {
      try {
        this.cache.updateInstallLog(logId, 'pending');

        const result = await this.dshClient.install(installSpec, profile);

        if (result.success) {
          this.cache.setInstalled(pluginId, true, plugin.version);
          this.cache.updateInstallLog(logId, 'success');
        } else {
          this.cache.updateInstallLog(logId, 'failed', result.error);
        }

        return {
          ...result,
          pluginId,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.cache.updateInstallLog(logId, 'failed', errorMsg);
        return {
          success: false,
          pluginId,
          error: errorMsg,
          durationMs: 0,
        };
      } finally {
        this.installingPlugins.delete(pluginId);
      }
    })();

    this.installingPlugins.set(pluginId, installPromise);
    return installPromise;
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: string, options?: { profile?: string }): Promise<UninstallResult> {
    const profile = options?.profile || this.defaultProfile;
    const startTime = Date.now();

    // 确保 dsh 命令可用
    const dshAvailable = await this.ensureDshAvailable();
    if (!dshAvailable) {
      return {
        success: false,
        pluginId,
        error: 'dsh 命令不可用',
        durationMs: 0,
      };
    }

    const plugin = this.cache.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        pluginId,
        error: 'Plugin not found in cache',
        durationMs: 0,
      };
    }

    const logId = this.cache.addInstallLog({
      pluginId,
      action: 'uninstall',
      version: plugin.installedVersion,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    try {
      // 尝试用插件名卸载
      const result = await this.dshClient.uninstall(plugin.name, profile);

      if (result.success) {
        this.cache.setInstalled(pluginId, false);
        this.cache.updateInstallLog(logId, 'success');
      } else {
        // 再试一次用完整 ID
        const result2 = await this.dshClient.uninstall(pluginId, profile);
        if (result2.success) {
          this.cache.setInstalled(pluginId, false);
          this.cache.updateInstallLog(logId, 'success');
          return { ...result2, pluginId, durationMs: Date.now() - startTime };
        }

        this.cache.updateInstallLog(logId, 'failed', result.error || result2.error);
      }

      return {
        success: result.success,
        pluginId,
        error: result.error,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.cache.updateInstallLog(logId, 'failed', errorMsg);
      return {
        success: false,
        pluginId,
        error: errorMsg,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 更新插件
   */
  async update(pluginId: string, options?: { profile?: string }): Promise<UpdateResult> {
    const profile = options?.profile || this.defaultProfile;
    const startTime = Date.now();

    // 确保 dsh 命令可用
    const dshAvailable = await this.ensureDshAvailable();
    if (!dshAvailable) {
      return {
        success: false,
        pluginId,
        error: 'dsh 命令不可用',
        durationMs: 0,
      };
    }

    const plugin = this.cache.getPlugin(pluginId);
    if (!plugin) {
      return {
        success: false,
        pluginId,
        error: 'Plugin not found in cache',
        durationMs: 0,
      };
    }

    const fromVersion = plugin.installedVersion;
    const installSpec = this.extractInstallSpec(plugin);

    if (!installSpec) {
      return {
        success: false,
        pluginId,
        error: 'Could not determine install spec',
        durationMs: 0,
      };
    }

    try {
      // 先卸载旧版本再安装新版本
      await this.dshClient.uninstall(plugin.name, profile);
      const result = await this.dshClient.install(installSpec, profile);

      if (result.success) {
        this.cache.setInstalled(pluginId, true, plugin.version);
      }

      return {
        success: result.success,
        pluginId,
        fromVersion,
        toVersion: result.success ? plugin.version : undefined,
        error: result.error,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        pluginId,
        fromVersion,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 获取已安装插件列表
   */
  async getInstalled(): Promise<InstalledPlugin[]> {
    const installed = this.cache.getInstalledPlugins();
    return installed.map((p) => ({
      id: p.id,
      name: p.name,
      version: p.installedVersion || p.version,
      source: p.source,
      installedAt: '', // 简化，不追踪具体安装时间
      profile: this.defaultProfile,
    }));
  }

  /**
   * 检查插件是否已安装
   */
  async isInstalled(pluginId: string): Promise<boolean> {
    const plugin = this.cache.getPlugin(pluginId);
    return plugin?.isInstalled || false;
  }

  /**
   * 获取安装状态
   */
  async getStatus(pluginId: string): Promise<InstallStatus> {
    if (this.installingPlugins.has(pluginId)) {
      return 'installing';
    }

    const plugin = this.cache.getPlugin(pluginId);
    if (!plugin) return 'not_installed';

    return plugin.isInstalled ? 'installed' : 'not_installed';
  }

  /**
   * 检查 dsh CLI 是否可用（会触发自动检测）
   */
  async isDshAvailable(): Promise<boolean> {
    return this.ensureDshAvailable();
  }

  /**
   * 从插件对象中提取安装标识
   */
  private extractInstallSpec(plugin: { id: string; name: string; source: string; version: string; url: string }): string | null {
    if (plugin.source === 'github') {
      // github:owner/repo 格式
      const fullName = plugin.id.slice('github:'.length);
      return `github:${fullName}`;
    }

    if (plugin.source === 'npm') {
      // npm 包名
      const pkgName = plugin.id.slice('npm:'.length);
      return `${pkgName}@${plugin.version || 'latest'}`;
    }

    return null;
  }
}
