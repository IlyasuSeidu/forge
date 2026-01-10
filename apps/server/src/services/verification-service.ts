import type { FastifyBaseLogger } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { VerificationStatus, type Verification } from '../models/index.js';

/**
 * VerificationService handles verification of generated artifacts
 * Ensures apps are functional before marking them as completed
 */
export class VerificationService {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'VerificationService' });
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
      'Starting verification (scaffold - no logic yet)'
    );

    // Count previous attempts
    const previousAttempts = await prisma.verification.count({
      where: { appRequestId },
    });

    // TODO: Implement verification logic
    // - Load artifacts
    // - Trigger validation checks

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

    return {
      ...verification,
      status: verification.status as VerificationStatus,
      errors: verification.errors ? JSON.parse(verification.errors) : null,
    };
  }

  /**
   * Marks a verification as passed
   * @param verificationId - The verification to mark as passed
   * @returns The updated verification record
   */
  async markPassed(verificationId: string): Promise<Verification> {
    this.logger.info(
      { verificationId },
      'Marking verification as passed (scaffold - no logic yet)'
    );

    const verification = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.Passed,
      },
    });

    // TODO: Update app request status to completed

    // Emit verification_passed event
    await this.emitEvent(
      verification.executionId,
      'verification_passed',
      'Verification completed successfully - all checks passed'
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
      'Marking verification as failed (scaffold - no logic yet)'
    );

    const verification = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.Failed,
        errors: JSON.stringify(errors),
      },
    });

    // TODO: Update app request status to verification_failed

    // Emit verification_failed event
    await this.emitEvent(
      verification.executionId,
      'verification_failed',
      `Verification failed with ${errors.length} error(s): ${errors.join(', ')}`
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
