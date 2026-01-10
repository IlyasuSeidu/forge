import type { FastifyBaseLogger } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { VerificationStatus, AppRequestStatus, ExecutionStatus, type Verification } from '../models/index.js';
import { StaticVerifier } from './static-verifier.js';
import { RuntimeVerifier } from './runtime-verifier.js';
import { WorkspaceService } from './workspace-service.js';
import { RepairAgent } from '../agents/repair-agent.js';

// STEP 6: Safety guard - maximum repair attempts
// ⚠️ CRITICAL: This bound prevents infinite repair loops (Invariant 3)
const MAX_REPAIR_ATTEMPTS = 5;

/**
 * VerificationService handles verification of generated artifacts
 * Ensures apps are functional before marking them as completed
 *
 * ⚠️ CRITICAL SYSTEM INVARIANT ⚠️
 * This service enforces Forge's core quality guarantees:
 * - No app marked "completed" without verification (Invariant 1)
 * - All failures visible to users (Invariant 2)
 * - Bounded self-healing with re-verification (Invariant 3)
 *
 * Do NOT bypass or weaken verification logic.
 * See docs/INVARIANTS.md for protected guarantees.
 * Frozen baseline: git tag phase-10-freeze
 */
export class VerificationService {
  private logger: FastifyBaseLogger;
  private staticVerifier: StaticVerifier;
  private runtimeVerifier: RuntimeVerifier;
  private repairAgent: RepairAgent;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'VerificationService' });
    this.staticVerifier = new StaticVerifier(logger);
    this.runtimeVerifier = new RuntimeVerifier(logger);
    this.repairAgent = new RepairAgent(logger);
  }

  /**
   * Starts a new verification process for an app request
   * Creates a verification record and initiates validation
   * @param appRequestId - The app request to verify
   * @param executionId - The execution that produced the artifacts
   * @returns The created verification record
   */
  async startVerification(
    appRequestId: string,
    executionId: string
  ): Promise<Verification> {
    this.logger.info(
      { appRequestId, executionId },
      'Starting verification with self-healing'
    );

    // Get the appRequest to find the projectId
    const appRequest = await prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest) {
      throw new Error(`AppRequest ${appRequestId} not found`);
    }

    // Count previous attempts
    const previousAttempts = await prisma.verification.count({
      where: { appRequestId },
    });

    // Create verification record
    const verification = await prisma.verification.create({
      data: {
        id: crypto.randomUUID(),
        appRequestId,
        executionId,
        status: VerificationStatus.Pending,
        attempt: previousAttempts + 1,
      },
    });

    // Emit verification_started event
    await this.emitEvent(
      executionId,
      'verification_started',
      `Verification started for app request (attempt ${verification.attempt})`
    );

    // STEP 4: Repair loop - try verification, repair if needed, re-verify
    try {
      // Get workspace path for this project
      const workspaceService = new WorkspaceService(this.logger, appRequest.projectId);
      const workspacePath = workspaceService.getWorkspaceRoot();

      let currentAttempt = 1;
      let lastErrors: string[] = [];

      // Loop: verify → repair → re-verify (up to MAX_REPAIR_ATTEMPTS)
      while (currentAttempt <= MAX_REPAIR_ATTEMPTS) {
        this.logger.info(
          { verificationId: verification.id, attempt: currentAttempt, maxAttempts: MAX_REPAIR_ATTEMPTS },
          `Verification attempt ${currentAttempt}`
        );

        // Run full verification (static + runtime)
        const verificationResult = await this.runFullVerification(
          verification.id,
          executionId,
          workspacePath
        );

        if (verificationResult.passed) {
          // Verification passed!
          this.logger.info(
            { verificationId: verification.id, attempt: currentAttempt },
            currentAttempt > 1
              ? 'Verification passed after repair'
              : 'Verification passed on first attempt'
          );

          // Update verification record with final attempt count
          await prisma.verification.update({
            where: { id: verification.id },
            data: { attempt: currentAttempt },
          });

          if (currentAttempt > 1) {
            // Emit special event for successful repair
            await this.emitEvent(
              executionId,
              'verification_passed_after_repair',
              `Verification passed after ${currentAttempt} attempt(s)`
            );
          }

          return await this.markPassed(verification.id);
        }

        // Verification failed
        lastErrors = verificationResult.errors;

        // Check if we can attempt repair
        if (currentAttempt >= MAX_REPAIR_ATTEMPTS) {
          // Max attempts reached - give up
          this.logger.warn(
            { verificationId: verification.id, errorCount: lastErrors.length },
            'Max repair attempts reached - verification failed'
          );

          // Update verification with final attempt count
          await prisma.verification.update({
            where: { id: verification.id },
            data: { attempt: currentAttempt },
          });

          // Emit final failure event
          await this.emitEvent(
            executionId,
            'repair_max_attempts_reached',
            `Verification failed after ${currentAttempt} attempts`
          );

          return await this.markFailed(verification.id, lastErrors);
        }

        // STEP 3: Attempt repair
        this.logger.info(
          { verificationId: verification.id, attempt: currentAttempt },
          'Verification failed - attempting repair'
        );

        await this.emitEvent(
          executionId,
          'repair_attempt_started',
          `Repair attempt ${currentAttempt} started (${lastErrors.length} errors to fix)`
        );

        const repairResult = await this.repairAgent.repair({
          verificationErrors: lastErrors,
          workspacePath,
          attempt: currentAttempt,
        });

        if (!repairResult.success) {
          // Repair failed to generate patches
          this.logger.error(
            { verificationId: verification.id, error: repairResult.error },
            'Repair agent failed to generate patches'
          );

          await this.emitEvent(
            executionId,
            'repair_attempt_failed',
            `Repair attempt ${currentAttempt} failed: ${repairResult.error}`
          );

          // Update attempt and mark as failed
          await prisma.verification.update({
            where: { id: verification.id },
            data: { attempt: currentAttempt },
          });

          return await this.markFailed(verification.id, lastErrors);
        }

        // Apply patches
        this.logger.info(
          { verificationId: verification.id, patchCount: repairResult.patches.length },
          'Applying repair patches'
        );

        for (const patch of repairResult.patches) {
          try {
            await workspaceService.writeFile(patch.filePath, patch.newContent);
            this.logger.debug(
              { filePath: patch.filePath },
              'Patch applied successfully'
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
              { filePath: patch.filePath, error: message },
              'Failed to apply patch'
            );
          }
        }

        await this.emitEvent(
          executionId,
          'repair_attempt_applied',
          `Repair attempt ${currentAttempt} applied (${repairResult.patches.length} files patched) - re-running verification`
        );

        // Increment attempt counter and loop back to re-verify
        currentAttempt++;
      }

      // Should never reach here, but just in case
      return await this.markFailed(verification.id, lastErrors);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        { verificationId: verification.id, error: errorMessage },
        'Verification crashed'
      );

      // Mark as failed
      return await this.markFailed(verification.id, [
        `Verification crashed: ${errorMessage}`,
      ]);
    }
  }

  /**
   * Helper: Run full verification (static + runtime)
   * Returns pass/fail and any errors found
   */
  private async runFullVerification(
    verificationId: string,
    executionId: string,
    workspacePath: string
  ): Promise<{ passed: boolean; errors: string[] }> {
    // Run static verification
    this.logger.info({ verificationId }, 'Running static verification');

    const staticResult = await this.staticVerifier.verify(workspacePath);

    if (!staticResult.passed) {
      this.logger.warn(
        { verificationId, errorCount: staticResult.errors.length },
        'Static verification failed'
      );

      return { passed: false, errors: staticResult.errors };
    }

    // Static passed - run runtime verification
    this.logger.info({ verificationId }, 'Static verification passed - running runtime verification');

    await this.emitEvent(
      executionId,
      'runtime_verification_started',
      'Static checks passed - starting runtime verification'
    );

    const runtimeResult = await this.runtimeVerifier.verify(workspacePath);

    if (!runtimeResult.passed) {
      this.logger.warn(
        { verificationId, errorCount: runtimeResult.errors.length },
        'Runtime verification failed'
      );

      return { passed: false, errors: runtimeResult.errors };
    }

    // Both passed!
    this.logger.info({ verificationId }, 'Both static and runtime verification passed');

    return { passed: true, errors: [] };
  }

  /**
   * Marks a verification as passed
   * @param verificationId - The verification to mark as passed
   * @returns The updated verification record
   */
  async markPassed(verificationId: string): Promise<Verification> {
    this.logger.info(
      { verificationId },
      'Marking verification as passed'
    );

    const verification = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.Passed,
      },
    });

    // Update AppRequest status to completed
    await prisma.appRequest.update({
      where: { id: verification.appRequestId },
      data: {
        status: AppRequestStatus.Completed,
      },
    });

    this.logger.info(
      { appRequestId: verification.appRequestId },
      'AppRequest marked as completed after verification passed'
    );

    // Update Execution status to completed
    await prisma.execution.update({
      where: { id: verification.executionId },
      data: {
        status: ExecutionStatus.Completed,
        finishedAt: new Date(),
      },
    });

    this.logger.info(
      { executionId: verification.executionId },
      'Execution marked as completed after verification passed'
    );

    // Emit verification_passed event
    await this.emitEvent(
      verification.executionId,
      'verification_passed',
      'Verification completed successfully - all static and runtime checks passed'
    );

    return {
      ...verification,
      status: verification.status as VerificationStatus,
      errors: verification.errors ? JSON.parse(verification.errors) : null,
    };
  }

  /**
   * Marks a verification as failed with error details
   * @param verificationId - The verification to mark as failed
   * @param errors - Array of validation errors
   * @returns The updated verification record
   */
  async markFailed(
    verificationId: string,
    errors: string[]
  ): Promise<Verification> {
    this.logger.info(
      { verificationId, errorCount: errors.length },
      'Marking verification as failed'
    );

    const verification = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.Failed,
        errors: JSON.stringify(errors),
      },
    });

    // Update AppRequest status to verification_failed
    await prisma.appRequest.update({
      where: { id: verification.appRequestId },
      data: {
        status: AppRequestStatus.VerificationFailed,
        errorReason: `Verification failed: ${errors.length} error(s) found`,
      },
    });

    this.logger.info(
      { appRequestId: verification.appRequestId },
      'AppRequest marked as verification_failed'
    );

    // Update Execution status to failed
    await prisma.execution.update({
      where: { id: verification.executionId },
      data: {
        status: ExecutionStatus.Failed,
        finishedAt: new Date(),
      },
    });

    this.logger.info(
      { executionId: verification.executionId },
      'Execution marked as failed after verification failed'
    );

    // Emit verification_failed event
    // Truncate error list in event message if too long
    const errorPreview = errors.slice(0, 3).join('; ');
    const moreErrors = errors.length > 3 ? ` (and ${errors.length - 3} more)` : '';

    await this.emitEvent(
      verification.executionId,
      'verification_failed',
      `Verification failed with ${errors.length} error(s): ${errorPreview}${moreErrors}`
    );

    return {
      ...verification,
      status: verification.status as VerificationStatus,
      errors: verification.errors ? JSON.parse(verification.errors) : null,
    };
  }

  /**
   * Gets a verification by ID
   */
  async getVerificationById(verificationId: string): Promise<Verification | null> {
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      return null;
    }

    return {
      ...verification,
      status: verification.status as VerificationStatus,
      errors: verification.errors ? JSON.parse(verification.errors) : null,
    };
  }

  /**
   * Gets all verifications for an app request
   */
  async getVerificationsByAppRequestId(appRequestId: string): Promise<Verification[]> {
    const verifications = await prisma.verification.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    return verifications.map((v) => ({
      ...v,
      status: v.status as VerificationStatus,
      errors: v.errors ? JSON.parse(v.errors) : null,
    }));
  }

  /**
   * Gets the latest verification for an app request
   */
  async getLatestVerification(appRequestId: string): Promise<Verification | null> {
    const verification = await prisma.verification.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return null;
    }

    return {
      ...verification,
      status: verification.status as VerificationStatus,
      errors: verification.errors ? JSON.parse(verification.errors) : null,
    };
  }

  /**
   * Emits a verification event to the execution event log
   * @private
   */
  private async emitEvent(
    executionId: string,
    type: string,
    message: string
  ): Promise<void> {
    await prisma.executionEvent.create({
      data: {
        id: crypto.randomUUID(),
        executionId,
        type,
        message,
      },
    });

    this.logger.info({ executionId, type, message }, 'Verification event emitted');
  }
}
