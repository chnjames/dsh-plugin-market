// ============================================================
// DSH Plugin Market - DSH CLI Wrapper
// ============================================================

import { execFile } from 'node:child_process';
import type { InstallResult, UninstallResult } from '../types.js';

function winBin(cmd: string): string {
  if (process.platform !== 'win32') return cmd;
  if (cmd === 'dsh' || cmd === 'npx' || cmd === 'npm' || cmd === 'pnpm') return `${cmd}.cmd`;
  return cmd;
}

export class DshCliClient {
  private dshCommand: string;
  private useNpx: boolean;

  constructor(dshCommand?: string) {
    if (dshCommand) {
      this.dshCommand = dshCommand;
      this.useNpx = dshCommand.startsWith('npx');
    } else {
      this.dshCommand = 'dsh';
      this.useNpx = false;
    }
  }

  async autoDetect(): Promise<boolean> {
    const available = await this.checkCommand(winBin('dsh'), ['--version']);
    if (available) {
      this.dshCommand = 'dsh';
      this.useNpx = false;
      return true;
    }

    const npxAvailable = await this.checkCommand(winBin('npx'), ['@deepseek-ai/dsh', '--version']);
    if (npxAvailable) {
      this.dshCommand = 'npx';
      this.useNpx = true;
      return true;
    }

    return false;
  }

  private async checkCommand(cmd: string, args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      execFile(cmd, args, { timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true }, (error) => {
        resolve(!error);
      });
    });
  }

  private resolveExec(): { cmd: string; prefix: string[] } {
    if (this.useNpx) {
      return { cmd: winBin('npx'), prefix: ['@deepseek-ai/dsh'] };
    }
    if (this.dshCommand.startsWith('npx')) {
      return { cmd: winBin('npx'), prefix: ['@deepseek-ai/dsh'] };
    }
    return { cmd: winBin(this.dshCommand), prefix: [] };
  }

  private async exec(args: string[], timeoutMs: number = 60000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const { cmd, prefix } = this.resolveExec();
    const actualArgs = [...prefix, ...args];

    return new Promise((resolve) => {
      execFile(
        cmd,
        actualArgs,
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
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

  async install(pluginSpec: string, profile: string = 'web'): Promise<InstallResult> {
    const startTime = Date.now();
    const { stdout, stderr, exitCode } = await this.exec([
      'plugin',
      '--profile',
      profile,
      'add',
      pluginSpec,
    ], 180000);

    const success = exitCode === 0;
    return {
      success,
      pluginId: pluginSpec,
      error: success ? undefined : stderr || stdout || `Exit code: ${exitCode}`,
      durationMs: Date.now() - startTime,
    };
  }

  async uninstall(pluginId: string, profile: string = 'web'): Promise<UninstallResult> {
    const startTime = Date.now();
    const { stdout, stderr, exitCode } = await this.exec([
      'plugin',
      '--profile',
      profile,
      'remove',
      pluginId,
    ]);

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

  async list(profile: string = 'web'): Promise<string[]> {
    const { stdout, exitCode } = await this.exec([
      'plugin',
      '--profile',
      profile,
      'list',
    ]);

    if (exitCode !== 0) return [];

    return stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const stripped = line.replace(/^[\s*•\-]+/, '');
        const token = stripped.split(/\s+/)[0] || '';
        return token.replace(/@[^@]+$/, '');
      })
      .filter((t) => t && t !== 'name' && t !== 'id' && !t.startsWith('-'));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { exitCode } = await this.exec(['--version'], 5000);
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const { stdout, exitCode } = await this.exec(['--version'], 5000);
      if (exitCode === 0) return stdout.trim();
      return null;
    } catch {
      return null;
    }
  }
}
