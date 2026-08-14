// ============================================================
// DSH Plugin Market - DSH CLI Wrapper
// ============================================================

import { execFile, spawn } from 'node:child_process';
import type { InstallResult, UninstallResult, UpdateResult } from '../types.js';

export class DshCliClient {
  private dshCommand: string;
  private useNpx: boolean;

  constructor(dshCommand?: string) {
    if (dshCommand) {
      // 用户显式指定了命令
      this.dshCommand = dshCommand;
      this.useNpx = dshCommand.startsWith('npx');
    } else {
      // 自动检测：先试全局 dsh，不行就用 npx
      this.dshCommand = 'dsh';
      this.useNpx = false;
    }
  }

  /**
   * 自动检测可用的 dsh 命令
   * 优先使用全局 dsh，如果不可用则回退到 npx @deepseek-ai/dsh
   */
  async autoDetect(): Promise<boolean> {
    // 先检查全局 dsh
    const available = await this.checkCommand('dsh', ['--version']);
    if (available) {
      this.dshCommand = 'dsh';
      this.useNpx = false;
      return true;
    }

    // 再试 npx
    const npxAvailable = await this.checkCommand('npx', ['@deepseek-ai/dsh', '--version']);
    if (npxAvailable) {
      this.dshCommand = 'npx';
      this.useNpx = true;
      return true;
    }

    return false;
  }

  /**
   * 检查某个命令是否可用
   */
  private async checkCommand(cmd: string, args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      const child = execFile(
        cmd,
        args,
        { timeout: 15000, maxBuffer: 1024 * 1024 },
        (error) => {
          resolve(!error);
        }
      );
    });
  }

  /**
   * 执行 dsh 命令并返回输出
   */
  private async exec(args: string[], timeoutMs: number = 60000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // 如果用 npx，需要在 args 前面加上 @deepseek-ai/dsh
    const actualArgs = this.useNpx ? ['@deepseek-ai/dsh', ...args] : args;
    const actualCmd = this.dshCommand;

    return new Promise((resolve) => {
      const child = execFile(
        actualCmd,
        actualArgs,
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error?.code ? Number(error.code) : error ? 1 : 0,
          });
        }
      );
    });
  }

  /**
   * 安装插件
   */
  async install(pluginSpec: string, profile: string = 'web'): Promise<InstallResult> {
    const startTime = Date.now();

    const { stdout, stderr, exitCode } = await this.exec([
      'plugin',
      '--profile',
      profile,
      'add',
      pluginSpec,
    ]);

    const success = exitCode === 0;

    return {
      success,
      pluginId: pluginSpec,
      error: success ? undefined : stderr || stdout || `Exit code: ${exitCode}`,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginId: string, profile: string = 'web'): Promise<UninstallResult> {
    const startTime = Date.now();

    // 尝试多种方式移除
    const { stdout, stderr, exitCode } = await this.exec([
      'plugin',
      '--profile',
      profile,
      'remove',
      pluginId,
    ]);

    // 如果 remove 失败，试试 delete
    let success = exitCode === 0;
    let error = success ? undefined : stderr || stdout || `Exit code: ${exitCode}`;

    if (!success) {
      const result2 = await this.exec([
        'plugin',
        '--profile',
        profile,
        'delete',
        pluginId,
      ]);
      if (result2.exitCode === 0) {
        success = true;
        error = undefined;
      }
    }

    return {
      success,
      pluginId,
      error,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * 列出已安装插件
   */
  async list(profile: string = 'web'): Promise<string[]> {
    const { stdout, exitCode } = await this.exec([
      'plugin',
      '--profile',
      profile,
      'list',
    ]);

    if (exitCode !== 0) {
      return [];
    }

    // 解析输出（不同版本格式可能不同，尽量兼容）
    const lines = stdout.split('\n').filter((l) => l.trim());
    return lines;
  }

  /**
   * 检查 dsh 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { exitCode } = await this.exec(['--version'], 5000);
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取 dsh 版本
   */
  async getVersion(): Promise<string | null> {
    try {
      const { stdout, exitCode } = await this.exec(['--version'], 5000);
      if (exitCode === 0) {
        return stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}
