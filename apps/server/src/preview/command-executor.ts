/**
 * COMMAND EXECUTOR
 *
 * Executes commands inside Docker containers with STRICT timeouts and NO retries.
 *
 * Constitutional constraints:
 * - Each command runs EXACTLY ONCE
 * - Non-zero exit → FAIL immediately
 * - Timeout → FAIL immediately
 * - NO retries
 * - NO auto-fix
 * - Output captured verbatim (no interpretation)
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
void execAsync;

export interface CommandResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface CommandTimeouts {
  install: 120000; // 2 minutes
  build: 300000; // 5 minutes
  start: 60000; // 1 minute
}

export const COMMAND_TIMEOUTS: CommandTimeouts = {
  install: 120000,
  build: 300000,
  start: 60000,
};

export class CommandExecutor {
  private readonly MAX_OUTPUT_LINES = 10000;

  /**
   * Execute a command inside a Docker container.
   *
   * CONSTITUTIONAL RULES:
   * - Runs ONCE (no retries)
   * - Timeout enforced strictly
   * - Non-zero exit throws
   * - Output captured verbatim
   */
  async executeInContainer(
    containerId: string,
    command: string,
    timeoutMs: number
  ): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const dockerCommand = `docker exec ${containerId} sh -c "${command.replace(/"/g, '\\"')}"`;

      const { stdout, stderr } = await this.execWithTimeout(dockerCommand, timeoutMs);

      const durationMs = Date.now() - startTime;

      return {
        command,
        exitCode: 0,
        stdout: this.truncateOutput(stdout),
        stderr: this.truncateOutput(stderr),
        durationMs,
        timedOut: false,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      // Timeout error
      if (err.killed || err.signal === 'SIGTERM') {
        return {
          command,
          exitCode: null,
          stdout: this.truncateOutput(err.stdout || ''),
          stderr: this.truncateOutput(
            (err.stderr || '') + '\n[TIMEOUT: Command exceeded ' + timeoutMs + 'ms]'
          ),
          durationMs: timeoutMs,
          timedOut: true,
        };
      }

      // Non-zero exit
      return {
        command,
        exitCode: err.code || 1,
        stdout: this.truncateOutput(err.stdout || ''),
        stderr: this.truncateOutput(err.stderr || err.message),
        durationMs,
        timedOut: false,
      };
    }
  }

  /**
   * Validate command exit code.
   * Non-zero or timeout → throws immediately.
   *
   * NO RETRIES. NO SECOND CHANCES.
   */
  validateExitCode(result: CommandResult): void {
    if (result.timedOut) {
      throw new Error(
        `COMMAND TIMEOUT: "${result.command}" exceeded ${result.durationMs}ms\n\n` +
          `STDERR:\n${result.stderr}`
      );
    }

    if (result.exitCode !== 0) {
      throw new Error(
        `COMMAND FAILED: "${result.command}" exited with code ${result.exitCode}\n\n` +
          `STDOUT:\n${result.stdout}\n\n` +
          `STDERR:\n${result.stderr}`
      );
    }
  }

  /**
   * Execute command with strict timeout.
   */
  private execWithTimeout(
    command: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = exec(command, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const error: any = new Error(`Command failed with exit code ${code}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      child.on('error', (err: any) => {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      });
    });
  }

  /**
   * Truncate output to first N lines (prevent memory exhaustion).
   */
  private truncateOutput(output: string): string {
    const lines = output.split('\n');

    if (lines.length <= this.MAX_OUTPUT_LINES) {
      return output;
    }

    return (
      lines.slice(0, this.MAX_OUTPUT_LINES).join('\n') +
      `\n\n[Output truncated: ${lines.length - this.MAX_OUTPUT_LINES} lines omitted]`
    );
  }
}
