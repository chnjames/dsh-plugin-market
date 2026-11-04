// ============================================================
// DSH Plugin Market - DSH CLI Wrapper
// ============================================================

import crossSpawn from 'cross-spawn';
import type { InstallResult, UninstallResult } from '../types.js';

function winBin(cmd: string): string {
  if (process.platform !== 'win32') return cmd;
  if (cmd === 'dsh' || cmd === 'npx' || cmd === 'npm' || cmd === 'pnpm') return `${cmd}.cmd`;
  return cmd;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a CLI and collect its output.
 *
 * `execFile` cannot start a `.cmd` / `.bat` shim on Windows: since the fix for
 * CVE-2024-27980 (Node 18.20.2 / 20.12.2 / 21.7.3+), spawning a batch file
 * without a shell throws `spawn EINVAL`. `winBin()` deliberately hands us
 * `dsh.cmd` / `npx.cmd`, so every CLI interaction fails there. cross-spawn
 * keeps `shell: false` and routes those shims through `cmd.exe` with quoted
 * arguments, which is the only way to start them without opening up command
 * injection through plugin specs.
 */
function run(cmd: string, args: string[], timeoutMs: number, maxBuffer: number): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const child = crossSpawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    const finish = (exitCode: number): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // A killed `cmd.exe` shim can leave the inherited pipes open; release
      // them so the host process is not held alive after a timeout.
      child.stdout?.destroy();
      child.stderr?.destroy();
      child.removeAllListeners();
      child.unref();
      resolve({ stdout, stderr, exitCode });
    };

    const timer = setTimeout(() => {
      child.kill();
      finish(1);
    }, timeoutMs);
    timer.unref();

    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
        if (stdout.length > maxBuffer) {
          child.kill();
          finish(1);
        }
      });
    }
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
        if (stderr.length > maxBuffer) {
          child.kill();
          finish(1);
        }
      });
    }

    child.on('error', () => finish(1));
    child.on('close', (code) => finish(code ?? 1));
  });
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
    const { exitCode } = await run(cmd, args, 15000, 1024 * 1024);
    return exitCode === 0;
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
    return run(cmd, actualArgs, timeoutMs, 10 * 1024 * 1024);
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
