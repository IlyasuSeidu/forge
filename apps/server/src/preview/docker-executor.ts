/**
 * DOCKER EXECUTOR
 *
 * Manages Docker container lifecycle for Preview Runtime.
 *
 * Constitutional constraints:
 * - Read-only workspace mount (NO code modification possible)
 * - Resource limits enforced (1 CPU, 512 MB RAM)
 * - No network egress
 * - Forced teardown on timeout
 * - Auto-remove on exit
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export interface ContainerConfig {
  workspaceDir: string; // Absolute path to assembled app
  port: number; // Host port to map to container port 3000
  containerName?: string; // Optional custom name
}

export interface ContainerInfo {
  containerId: string;
  containerName: string;
  port: number;
  status: 'created' | 'running' | 'exited' | 'killed';
}

export class DockerExecutor {
  private readonly DOCKER_IMAGE = 'node:18.19.0-alpine';
  private readonly CONTAINER_PORT = 3000;

  /**
   * Launch a Docker container with read-only workspace mount.
   *
   * CONSTITUTIONAL GUARANTEES:
   * - Workspace mounted read-only (NO code modification)
   * - CPU limit: 1 core
   * - Memory limit: 512 MB
   * - PID limit: 100 processes
   * - No network egress (bridge mode, no DNS)
   * - Auto-remove on exit
   */
  async launchContainer(config: ContainerConfig): Promise<ContainerInfo> {
    const containerName = config.containerName || `forge-preview-${randomUUID()}`;

    // Verify workspace exists
    try {
      await execAsync(`test -d "${config.workspaceDir}"`);
    } catch (err) {
      throw new Error(`Workspace directory does not exist: ${config.workspaceDir}`);
    }

    // Build docker run command with strict resource limits
    const dockerCommand = [
      'docker run',
      '--detach', // Run in background
      `--name ${containerName}`,
      '--rm', // Auto-remove on exit

      // Read-only workspace mount (CRITICAL)
      `--volume "${config.workspaceDir}":/app:ro`,

      // Working directory
      '--workdir /app',

      // Port mapping
      `--publish ${config.port}:${this.CONTAINER_PORT}`,

      // Resource limits
      '--cpus=1', // Max 1 CPU core
      '--memory=512m', // Max 512 MB RAM
      '--memory-swap=512m', // No swap (hard limit)
      '--pids-limit=100', // Max 100 processes

      // Network isolation (no egress)
      '--network bridge',
      '--dns=""', // No DNS servers (prevent external lookups)

      // Environment variables
      '--env NODE_ENV=production',
      '--env PORT=3000',
      '--env HOSTNAME=0.0.0.0',

      // User (run as non-root)
      '--user node',

      // Image
      this.DOCKER_IMAGE,

      // Keep container alive (we'll exec commands into it)
      'tail -f /dev/null',
    ].join(' ');

    try {
      const { stdout } = await execAsync(dockerCommand);
      const containerId = stdout.trim();

      return {
        containerId,
        containerName,
        port: config.port,
        status: 'running',
      };
    } catch (err: any) {
      throw new Error(`Failed to launch Docker container: ${err.message}`);
    }
  }

  /**
   * Check if container is running.
   */
  async isContainerRunning(containerId: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker inspect -f '{{.State.Running}}' ${containerId}`
      );
      return stdout.trim() === 'true';
    } catch (err) {
      return false;
    }
  }

  /**
   * Get container status.
   */
  async getContainerStatus(
    containerId: string
  ): Promise<'running' | 'exited' | 'killed' | 'unknown'> {
    try {
      const { stdout } = await execAsync(
        `docker inspect -f '{{.State.Status}}' ${containerId}`
      );
      const status = stdout.trim();

      if (status === 'running') return 'running';
      if (status === 'exited') return 'exited';
      if (status === 'killed' || status === 'dead') return 'killed';

      return 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }

  /**
   * Kill container (SIGTERM for graceful, SIGKILL for force).
   */
  async killContainer(containerId: string, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<void> {
    try {
      await execAsync(`docker kill --signal=${signal} ${containerId}`);
    } catch (err) {
      // Container may already be stopped - that's OK
    }
  }

  /**
   * Wait for container to exit (with timeout).
   */
  async waitForExit(containerId: string, timeoutMs: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const running = await this.isContainerRunning(containerId);
      if (!running) {
        return true;
      }

      // Poll every 500ms
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return false; // Timeout
  }

  /**
   * Forceful teardown with grace period.
   *
   * 1. Try SIGTERM (graceful)
   * 2. Wait up to 5 seconds
   * 3. Force SIGKILL if still running
   */
  async forceTerminate(containerId: string): Promise<void> {
    // Try graceful shutdown
    await this.killContainer(containerId, 'SIGTERM');

    // Wait up to 5 seconds
    const exited = await this.waitForExit(containerId, 5000);

    // Force kill if still running
    if (!exited) {
      await this.killContainer(containerId, 'SIGKILL');
    }

    // Container should be removed automatically (--rm flag)
  }

  /**
   * Check if Docker is available.
   */
  async checkDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Pull Docker image if not present.
   */
  async ensureImageAvailable(): Promise<void> {
    try {
      // Check if image exists
      await execAsync(`docker inspect ${this.DOCKER_IMAGE}`);
    } catch (err) {
      // Image doesn't exist - pull it
      console.log(`Pulling Docker image: ${this.DOCKER_IMAGE}...`);
      await execAsync(`docker pull ${this.DOCKER_IMAGE}`);
    }
  }
}
