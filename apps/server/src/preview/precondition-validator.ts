/**
 * PRECONDITION VALIDATOR
 *
 * Validates that all preconditions are met before starting a preview session.
 *
 * HARD REQUIREMENTS (ALL must pass):
 * 1. Completion Auditor verdict === COMPLETE
 * 2. Framework Assembly Manifest exists
 * 3. Manifest is hash-locked
 * 4. Workspace directory exists
 *
 * If ANY precondition fails → THROW and HALT.
 * NO RETRIES. NO WORKAROUNDS.
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import type { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { join } from 'path';

export interface PreviewPreconditionCheck {
  valid: boolean;
  errors: string[];
}

export class PreconditionValidator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate all preconditions for starting a preview session.
   *
   * Throws immediately if any precondition fails.
   */
  async validate(appRequestId: string): Promise<void> {
    const errors: string[] = [];

    // Check 1: AppRequest exists
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest) {
      errors.push(`AppRequest not found: ${appRequestId}`);
      this.throwPreconditionError(errors);
    }

    // Check 2: Completion Auditor verdict = COMPLETE
    const completionReport = await this.prisma.completionReport.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!completionReport) {
      errors.push('No Completion Report found');
      errors.push('Preview requires Completion Auditor to have run');
      this.throwPreconditionError(errors);
    }

    if (completionReport.verdict !== 'COMPLETE') {
      errors.push(`Completion verdict is ${completionReport.verdict} (expected: COMPLETE)`);
      errors.push('Preview can only run for COMPLETED builds');
      this.throwPreconditionError(errors);
    }

    // Check 3: Framework Assembly Manifest exists
    const manifest = await this.prisma.frameworkAssemblyManifest.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!manifest) {
      errors.push('Framework Assembly Manifest not found');
      errors.push('Preview requires Framework Assembly Layer to have run');
      this.throwPreconditionError(errors);
    }

    // Check 4: Manifest is hash-locked
    if (!manifest!.manifestHash) {
      errors.push('Framework Assembly Manifest is not hash-locked');
      errors.push('manifestHash is required for preview');
      this.throwPreconditionError(errors);
    }

    // Check 5: Workspace directory exists
    const workspaceDir = join('/tmp/forge-workspaces', appRequestId, 'nextjs-app');

    if (!existsSync(workspaceDir)) {
      errors.push(`Workspace directory does not exist: ${workspaceDir}`);
      errors.push('Framework Assembly Layer may have failed to create app');
      this.throwPreconditionError(errors);
    }

    // Check 6: Conductor state (optional check - not blocking)
    const conductorState = await this.prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (conductorState && conductorState.locked) {
      errors.push('Conductor is currently locked (build in progress)');
      errors.push('Preview cannot run while build is active');
      this.throwPreconditionError(errors);
    }

    // All checks passed
  }

  /**
   * Throw precondition validation error.
   */
  private throwPreconditionError(errors: string[]): never {
    throw new Error(
      `PRECONDITION VALIDATION FAILED:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }

  /**
   * Get manifest hash for session creation.
   */
  async getManifestHash(appRequestId: string): Promise<string> {
    const manifest = await this.prisma.frameworkAssemblyManifest.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!manifest || !manifest.manifestHash) {
      throw new Error('Framework Assembly Manifest not found or not hash-locked');
    }

    return manifest.manifestHash;
  }

  /**
   * Get workspace directory for session.
   */
  getWorkspaceDir(appRequestId: string): string {
    return join('/tmp/forge-workspaces', appRequestId, 'nextjs-app');
  }
}
