/**
 * PREVIEW RUNTIME
 *
 * Mechanical execution chamber for running Forge-assembled applications.
 *
 * PUBLIC API:
 * - startPreview(appRequestId): Start a preview session
 * - getPreviewStatus(sessionId): Get current status
 * - terminatePreview(sessionId): Stop and cleanup
 *
 * CONSTITUTIONAL CONSTRAINTS:
 * - Zero intelligence, zero autonomy
 * - No retries, no auto-fix, no interpretation
 * - Fail-loud on all violations
 * - Read-only workspace mount
 * - 30-minute TTL (forced teardown)
 *
 * Philosophy: RUN → OBSERVE → DESTROY
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { PortAllocator } from './port-allocator';
import { DockerExecutor } from './docker-executor';
import { CommandExecutor, COMMAND_TIMEOUTS } from './command-executor';
import { PreviewStateMachine } from './preview-state-machine';
import { PreconditionValidator } from './precondition-validator';
import { computeSessionHash, computeDirectoryHash } from './hash-utils';
import type { SessionStatus } from './preview-runtime-types';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class PreviewRuntime {
  private portAllocator = new PortAllocator();
  private dockerExecutor = new DockerExecutor();
  private commandExecutor = new CommandExecutor();
  private ttlTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaClient,
    private logger: Logger
  ) {}

  /**
   * PUBLIC API: Start a preview session.
   *
   * PRECONDITIONS (ALL must pass):
   * - Completion Auditor verdict = COMPLETE
   * - Framework Assembly manifest exists
   * - Manifest is hash-locked
   * - Workspace directory exists
   *
   * Returns sessionId for polling.
   */
  async startPreview(appRequestId: string): Promise<string> {
    this.logger.info({ event: 'preview.start_requested', appRequestId });

    // PHASE 1: Validate preconditions (throws if fails)
    const validator = new PreconditionValidator(this.prisma);
    await validator.validate(appRequestId);

    // PHASE 2: Get manifest hash and workspace
    const manifestHash = await validator.getManifestHash(appRequestId);
    const workspaceDir = validator.getWorkspaceDir(appRequestId);

    // PHASE 3: Compute workspace hash
    this.logger.info({ event: 'preview.computing_workspace_hash', workspaceDir });
    const workspaceHash = computeDirectoryHash(workspaceDir);

    // PHASE 4: Allocate port
    const port = this.portAllocator.allocate();

    // PHASE 5: Create session record (status: READY)
    const sessionId = randomUUID();
    const session = await this.prisma.previewRuntimeSession.create({
      data: {
        id: sessionId,
        appRequestId,
        framework: 'nextjs',
        frameworkVersion: '14.2.0',
        manifestHash,
        workspaceHash,
        status: 'READY',
        port,
        previewUrl: `http://localhost:${port}`,
        startedAt: BigInt(Date.now()),
        sessionHash: '', // Computed after termination
      },
    });

    this.logger.info({
      event: 'preview.session_created',
      sessionId,
      appRequestId,
      port,
    });

    // PHASE 6: Launch container and execute (async, don't block)
    this.executePreview(sessionId, workspaceDir, port).catch((err) => {
      this.logger.error({
        event: 'preview.execution_failed',
        sessionId,
        error: err.message,
      });
    });

    return sessionId;
  }

  /**
   * PUBLIC API: Get preview status.
   * Read-only, safe to poll frequently.
   */
  async getPreviewStatus(sessionId: string): Promise<{
    sessionId: string;
    status: SessionStatus;
    previewUrl: string | null;
    failureStage: string | null;
    failureOutput: string | null;
  }> {
    const session = await this.prisma.previewRuntimeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      sessionId: session.id,
      status: session.status as SessionStatus,
      previewUrl: session.previewUrl,
      failureStage: session.failureStage,
      failureOutput: session.failureOutput,
    };
  }

  /**
   * PUBLIC API: Terminate preview session.
   * Idempotent - safe to call multiple times.
   */
  async terminatePreview(sessionId: string, reason: 'MANUAL' | 'TTL_EXPIRED' = 'MANUAL'): Promise<void> {
    this.logger.info({ event: 'preview.terminate_requested', sessionId, reason });

    const session = await this.prisma.previewRuntimeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Cancel TTL timer
    this.cancelTTL(sessionId);

    // Kill container if exists
    if (session.containerId) {
      await this.dockerExecutor.forceTerminate(session.containerId);
    }

    // Release port
    if (session.port) {
      this.portAllocator.release(session.port);
    }

    // Update session status (if not already terminal)
    const currentStatus = session.status as SessionStatus;
    if (currentStatus !== 'FAILED' && currentStatus !== 'TERMINATED') {
      await this.updateSessionStatus(sessionId, 'TERMINATED', null, null);
    }

    // Compute final session hash
    await this.finalizeSessionHash(sessionId);

    this.logger.info({ event: 'preview.terminated', sessionId, reason });
  }

  /**
   * INTERNAL: Execute preview (async).
   * Runs container, executes commands, handles failures.
   */
  private async executePreview(
    sessionId: string,
    workspaceDir: string,
    port: number
  ): Promise<void> {
    const stateMachine = new PreviewStateMachine(sessionId, this.logger);

    try {
      // Transition: READY → STARTING
      await this.updateSessionStatus(sessionId, 'STARTING', null, null);

      // Launch Docker container
      this.logger.info({ event: 'preview.launching_container', sessionId });
      const containerInfo = await this.dockerExecutor.launchContainer({
        workspaceDir,
        port,
      });

      // Update container ID
      await this.prisma.previewRuntimeSession.update({
        where: { id: sessionId },
        data: { containerId: containerInfo.containerId },
      });

      // Start TTL timer
      this.startTTL(sessionId);

      // COMMAND 1: npm install
      this.logger.info({ event: 'preview.command_install', sessionId });
      const installResult = await this.commandExecutor.executeInContainer(
        containerInfo.containerId,
        'npm install --ignore-scripts --omit=dev --loglevel=error',
        COMMAND_TIMEOUTS.install
      );

      await this.saveCommandResult(sessionId, 'install', installResult);
      this.commandExecutor.validateExitCode(installResult);

      // Transition: STARTING → BUILDING
      await this.updateSessionStatus(sessionId, 'BUILDING', null, null);

      // COMMAND 2: npm run build
      this.logger.info({ event: 'preview.command_build', sessionId });
      const buildResult = await this.commandExecutor.executeInContainer(
        containerInfo.containerId,
        'npm run build',
        COMMAND_TIMEOUTS.build
      );

      await this.saveCommandResult(sessionId, 'build', buildResult);
      this.commandExecutor.validateExitCode(buildResult);

      // Transition: BUILDING → RUNNING
      await this.updateSessionStatus(sessionId, 'RUNNING', null, null);

      // COMMAND 3: npm run start
      this.logger.info({ event: 'preview.command_start', sessionId });

      // Start npm start in background (don't wait for exit)
      const startCommand = 'npm run start';
      this.executeStartCommand(containerInfo.containerId, startCommand, sessionId);

      // Wait for server to be ready (poll for up to 60 seconds)
      await this.waitForServerReady(port, sessionId);

      this.logger.info({
        event: 'preview.running',
        sessionId,
        previewUrl: `http://localhost:${port}`,
      });
    } catch (err: any) {
      this.logger.error({
        event: 'preview.execution_error',
        sessionId,
        error: err.message,
      });

      // Determine failure stage
      const session = await this.prisma.previewRuntimeSession.findUnique({
        where: { id: sessionId },
      });

      let failureStage: 'install' | 'build' | 'start' | 'timeout' | 'crash' = 'crash';

      if (session?.status === 'STARTING') {
        failureStage = 'install';
      } else if (session?.status === 'BUILDING') {
        failureStage = 'build';
      } else if (session?.status === 'RUNNING') {
        failureStage = 'start';
      }

      if (err.message.includes('TIMEOUT')) {
        failureStage = 'timeout';
      }

      // Transition to FAILED
      await this.updateSessionStatus(sessionId, 'FAILED', failureStage, err.message);

      // Cleanup
      await this.terminatePreview(sessionId, 'MANUAL');
    }
  }

  /**
   * Execute npm start in background (doesn't block).
   */
  private async executeStartCommand(
    containerId: string,
    command: string,
    sessionId: string
  ): Promise<void> {
    // Execute in background, capture output asynchronously
    const startTime = Date.now();

    try {
      // Just trigger the start command, don't wait for completion
      const result = await this.commandExecutor.executeInContainer(
        containerId,
        command,
        COMMAND_TIMEOUTS.start
      );

      await this.saveCommandResult(sessionId, 'start', {
        ...result,
        durationMs: Date.now() - startTime,
      });
    } catch (err: any) {
      // Start command may timeout (that's OK if server is running)
      this.logger.warn({
        event: 'preview.start_command_timeout',
        sessionId,
        message: 'npm start may still be running',
      });
    }
  }

  /**
   * Wait for server to be ready (poll HTTP endpoint).
   */
  private async waitForServerReady(port: number, sessionId: string): Promise<void> {
    const maxAttempts = 30; // 30 seconds (poll every 1s)
    const pollInterval = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.status === 200 || response.status === 404) {
          // Server is responding
          return;
        }
      } catch (err) {
        // Server not ready yet, continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Server did not become ready after ${maxAttempts} seconds on port ${port}`
    );
  }

  /**
   * Update session status with state machine validation.
   */
  private async updateSessionStatus(
    sessionId: string,
    newStatus: SessionStatus,
    failureStage: string | null,
    failureOutput: string | null
  ): Promise<void> {
    const session = await this.prisma.previewRuntimeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const stateMachine = new PreviewStateMachine(sessionId, this.logger);
    const currentStatus = session.status as SessionStatus;

    // Validate transition
    stateMachine.transition(currentStatus, newStatus);

    // Update database
    const updateData: any = {
      status: newStatus,
    };

    if (newStatus === 'RUNNING') {
      updateData.runningAt = BigInt(Date.now());
    }

    if (newStatus === 'FAILED' || newStatus === 'TERMINATED') {
      updateData.terminatedAt = BigInt(Date.now());
    }

    if (failureStage) {
      updateData.failureStage = failureStage;
    }

    if (failureOutput) {
      updateData.failureOutput = failureOutput;
    }

    await this.prisma.previewRuntimeSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Save command execution result.
   */
  private async saveCommandResult(
    sessionId: string,
    stage: 'install' | 'build' | 'start',
    result: {
      command: string;
      exitCode: number | null;
      stdout: string;
      stderr: string;
      durationMs: number;
    }
  ): Promise<void> {
    const updateData: any = {};

    if (stage === 'install') {
      updateData.installStdout = result.stdout;
      updateData.installStderr = result.stderr;
      updateData.installExitCode = result.exitCode;
      updateData.installDurationMs = BigInt(result.durationMs);
    } else if (stage === 'build') {
      updateData.buildStdout = result.stdout;
      updateData.buildStderr = result.stderr;
      updateData.buildExitCode = result.exitCode;
      updateData.buildDurationMs = BigInt(result.durationMs);
    } else if (stage === 'start') {
      updateData.startStdout = result.stdout;
      updateData.startStderr = result.stderr;
      updateData.startExitCode = result.exitCode;
      updateData.startDurationMs = BigInt(result.durationMs);
    }

    await this.prisma.previewRuntimeSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Start TTL timer (30 minutes).
   */
  private startTTL(sessionId: string): void {
    const timeoutHandle = setTimeout(() => {
      this.logger.warn({ event: 'preview.ttl_expired', sessionId });
      this.terminatePreview(sessionId, 'TTL_EXPIRED').catch((err) => {
        this.logger.error({
          event: 'preview.ttl_termination_failed',
          sessionId,
          error: err.message,
        });
      });
    }, SESSION_TTL_MS);

    this.ttlTimers.set(sessionId, timeoutHandle);
  }

  /**
   * Cancel TTL timer.
   */
  private cancelTTL(sessionId: string): void {
    const timeoutHandle = this.ttlTimers.get(sessionId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.ttlTimers.delete(sessionId);
    }
  }

  /**
   * Compute and save final session hash (after termination).
   */
  private async finalizeSessionHash(sessionId: string): Promise<void> {
    const session = await this.prisma.previewRuntimeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return;
    }

    const sessionHash = computeSessionHash({
      appRequestId: session.appRequestId,
      framework: session.framework,
      frameworkVersion: session.frameworkVersion,
      manifestHash: session.manifestHash,
      workspaceHash: session.workspaceHash,
      status: session.status as SessionStatus,
      failureStage: session.failureStage,
      failureOutput: session.failureOutput,
    });

    await this.prisma.previewRuntimeSession.update({
      where: { id: sessionId },
      data: { sessionHash },
    });
  }

  /**
   * Cleanup all active sessions (for graceful shutdown).
   */
  async cleanupAll(): Promise<void> {
    this.logger.info({ event: 'preview.cleanup_all' });

    const activeSessions = await this.prisma.previewRuntimeSession.findMany({
      where: {
        status: {
          in: ['READY', 'STARTING', 'BUILDING', 'RUNNING'],
        },
      },
    });

    for (const session of activeSessions) {
      await this.terminatePreview(session.id, 'MANUAL');
    }
  }
}
