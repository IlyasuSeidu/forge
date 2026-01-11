/**
 * Completion Auditor - Tier 5 Decision Authority Agent
 *
 * THE FINAL ARBITER OF BUILD PROGRESS
 *
 * This agent decides what happens after verification completes.
 * It does NOT execute, repair, or modify anything.
 * It ONLY makes decisions based on strict rules.
 *
 * ABSOLUTE PROHIBITIONS:
 * - NEVER executes code
 * - NEVER modifies files
 * - NEVER skips verification
 * - NEVER advances execution directly
 * - NEVER changes project rules
 * - NEVER invents new decisions
 * - NEVER acts without verification data
 *
 * This is the judge, not the builder.
 */

import type { PrismaClient } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';

const MAX_REPAIR_ATTEMPTS = 3;

// Decision types
export type AuditorDecision =
  | { type: 'proceed_to_next_unit' }
  | { type: 'retry_with_repair' }
  | { type: 'escalate_to_human'; reason: string }
  | { type: 'mark_completed' }
  | { type: 'mark_failed'; reason: string };

// Error categories
type ErrorCategory = 'repairable' | 'non_repairable';

interface ErrorClassification {
  category: ErrorCategory;
  reason: string;
}

export class CompletionAuditor {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;

  // Non-repairable error patterns
  private readonly NON_REPAIRABLE_PATTERNS = [
    /security\s+violation/i,
    /ruleset\s+violation/i,
    /architectural\s+conflict/i,
    /data\s+loss/i,
    /unauthorized\s+dependency/i,
    /mutation\s+outside\s+contract/i,
    /forbidden\s+file\s+modified/i,
  ];

  // Repairable error patterns
  private readonly REPAIRABLE_PATTERNS = [
    /missing\s+dom\s+id/i,
    /runtime\s+error/i,
    /missing\s+file/i,
    /incorrect\s+import/i,
    /logic\s+error/i,
    /path\s+issue/i,
    /undefined\s+variable/i,
    /compilation\s+error/i,
  ];

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;

    this.logger.info('CompletionAuditor initialized');
  }

  /**
   * Audit the current state and make a decision
   * This is the ONLY public method
   *
   * Returns exactly ONE decision per call
   */
  async audit(appRequestId: string): Promise<AuditorDecision> {
    this.logger.info({ appRequestId }, 'CompletionAuditor: Starting audit');

    // PROHIBITION CHECK: Ensure we're in a valid state to audit
    await this.validateAuditPreconditions(appRequestId);

    // Get latest verification
    const verification = await this.getLatestVerification(appRequestId);

    if (!verification) {
      throw new Error('Cannot audit: No verification found');
    }

    // Get current execution unit (if any)
    const executionUnit = await this.getCurrentExecutionUnit(appRequestId);

    // Apply decision rules
    const decision = await this.applyDecisionRules(
      appRequestId,
      verification,
      executionUnit
    );

    // Record decision in database
    await this.recordDecision(appRequestId, executionUnit?.id, decision);

    // Emit event
    await this.emitDecisionEvent(appRequestId, executionUnit?.id, decision);

    this.logger.info(
      { appRequestId, decisionType: decision.type },
      'CompletionAuditor: Decision made'
    );

    return decision;
  }

  /**
   * Validate that we're in a valid state to perform an audit
   */
  private async validateAuditPreconditions(appRequestId: string): Promise<void> {
    const conductorState = await this.conductor.getStateSnapshot(appRequestId);

    if (!conductorState) {
      throw new Error('Cannot audit: No conductor state found');
    }

    // Conductor must be in verifying or building state
    const validStates = ['verifying', 'building'];
    if (!validStates.includes(conductorState.currentStatus)) {
      throw new Error(
        `Cannot audit: Conductor state is '${conductorState.currentStatus}', expected one of: ${validStates.join(', ')}`
      );
    }
  }

  /**
   * Get the latest verification for this app request
   */
  private async getLatestVerification(appRequestId: string) {
    return await this.prisma.verification.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the current execution unit (most recently completed or in progress)
   */
  private async getCurrentExecutionUnit(appRequestId: string) {
    const plan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId, status: 'approved' },
      include: { units: true },
    });

    if (!plan) return null;

    // Find the unit that was just completed or is in progress
    return plan.units.find(
      (u) => u.status === 'completed' || u.status === 'in_progress'
    ) || null;
  }

  /**
   * Apply decision rules in order
   * Returns exactly ONE decision
   */
  private async applyDecisionRules(
    appRequestId: string,
    verification: any,
    executionUnit: any
  ): Promise<AuditorDecision> {
    // RULE 1: Verification passed + more units → proceed
    if (verification.status === 'passed') {
      const hasPendingUnits = await this.hasPendingUnits(appRequestId);

      if (hasPendingUnits) {
        this.logger.info('RULE 1: Verification passed, proceeding to next unit');
        return { type: 'proceed_to_next_unit' };
      }

      // RULE 2: Verification passed + no more units → completed
      this.logger.info('RULE 2: Verification passed, no more units, marking completed');
      return { type: 'mark_completed' };
    }

    // Verification failed - classify the error
    const errorClassification = this.classifyErrors(verification.errors || '');

    // RULE 5: Non-repairable error → failed
    if (errorClassification.category === 'non_repairable') {
      this.logger.info('RULE 5: Non-repairable error detected, marking failed');
      return {
        type: 'mark_failed',
        reason: `Non-repairable verification failure: ${errorClassification.reason}`,
      };
    }

    // Error is repairable - check repair attempts
    const repairAttempts = verification.attempt || 1;

    // RULE 4: Repair exhausted → escalate
    if (repairAttempts >= MAX_REPAIR_ATTEMPTS) {
      this.logger.info('RULE 4: Maximum repair attempts reached, escalating to human');
      return {
        type: 'escalate_to_human',
        reason: 'Maximum automated repair attempts reached',
      };
    }

    // RULE 3: Repairable error + budget available → retry
    this.logger.info('RULE 3: Repairable error with budget, retrying with repair');
    return { type: 'retry_with_repair' };
  }

  /**
   * Check if there are pending execution units
   */
  private async hasPendingUnits(appRequestId: string): Promise<boolean> {
    const plan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId, status: 'approved' },
      include: { units: true },
    });

    if (!plan) return false;

    return plan.units.some((u) => u.status === 'pending');
  }

  /**
   * Classify errors as repairable or non-repairable
   */
  private classifyErrors(errors: string): ErrorClassification {
    // Check for non-repairable patterns first
    for (const pattern of this.NON_REPAIRABLE_PATTERNS) {
      if (pattern.test(errors)) {
        return {
          category: 'non_repairable',
          reason: `Matched non-repairable pattern: ${pattern.source}`,
        };
      }
    }

    // Check for repairable patterns
    for (const pattern of this.REPAIRABLE_PATTERNS) {
      if (pattern.test(errors)) {
        return {
          category: 'repairable',
          reason: `Matched repairable pattern: ${pattern.source}`,
        };
      }
    }

    // Default: assume repairable (conservative approach)
    return {
      category: 'repairable',
      reason: 'No specific pattern matched, defaulting to repairable',
    };
  }

  /**
   * Record the decision in the database
   */
  private async recordDecision(
    appRequestId: string,
    executionUnitId: string | null | undefined,
    decision: AuditorDecision
  ): Promise<void> {
    await this.prisma.completionDecision.create({
      data: {
        id: randomUUID(),
        appRequestId,
        executionUnitId: executionUnitId || null,
        decisionType: decision.type,
        reason: 'reason' in decision ? decision.reason : null,
      },
    });
  }

  /**
   * Emit event for the decision
   * Exactly ONE event per audit
   */
  private async emitDecisionEvent(
    appRequestId: string,
    executionUnitId: string | null | undefined,
    decision: AuditorDecision
  ): Promise<void> {
    const eventType = this.getEventType(decision.type);
    const message = this.getEventMessage(decision);

    // Find execution ID
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest?.executionId) {
      this.logger.warn('No execution ID found for event emission');
      return;
    }

    await this.prisma.executionEvent.create({
      data: {
        id: randomUUID(),
        executionId: appRequest.executionId,
        type: eventType,
        message: JSON.stringify({
          appRequestId,
          executionUnitId: executionUnitId || null,
          decisionType: decision.type,
          reason: 'reason' in decision ? decision.reason : null,
        }),
      },
    });

    this.logger.info({ appRequestId, eventType, message }, 'Event emitted');
  }

  /**
   * Get event type for decision
   */
  private getEventType(decisionType: string): string {
    const eventMap: Record<string, string> = {
      proceed_to_next_unit: 'completion_audit_passed',
      retry_with_repair: 'completion_audit_retry',
      escalate_to_human: 'completion_audit_escalated',
      mark_completed: 'completion_audit_completed',
      mark_failed: 'completion_audit_failed',
    };

    return eventMap[decisionType] || 'completion_audit_unknown';
  }

  /**
   * Get event message for decision
   */
  private getEventMessage(decision: AuditorDecision): string {
    switch (decision.type) {
      case 'proceed_to_next_unit':
        return 'Verification passed, proceeding to next execution unit';
      case 'retry_with_repair':
        return 'Verification failed, retrying with repair';
      case 'escalate_to_human':
        return `Escalated to human: ${decision.reason}`;
      case 'mark_completed':
        return 'All execution units completed successfully';
      case 'mark_failed':
        return `Build failed: ${decision.reason}`;
      default:
        return 'Unknown decision';
    }
  }

  /**
   * HARD PROHIBITION: This method must never be implemented
   * Kept here as documentation of what is FORBIDDEN
   */
  private async executeCode(): Promise<never> {
    throw new Error('PROHIBITION VIOLATED: CompletionAuditor cannot execute code');
  }

  /**
   * HARD PROHIBITION: This method must never be implemented
   */
  private async modifyFiles(): Promise<never> {
    throw new Error('PROHIBITION VIOLATED: CompletionAuditor cannot modify files');
  }

  /**
   * HARD PROHIBITION: This method must never be implemented
   */
  private async skipVerification(): Promise<never> {
    throw new Error('PROHIBITION VIOLATED: CompletionAuditor cannot skip verification');
  }

  /**
   * HARD PROHIBITION: This method must never be implemented
   */
  private async advanceExecutionDirectly(): Promise<never> {
    throw new Error(
      'PROHIBITION VIOLATED: CompletionAuditor cannot advance execution directly'
    );
  }

  /**
   * HARD PROHIBITION: This method must never be implemented
   */
  private async changeProjectRules(): Promise<never> {
    throw new Error('PROHIBITION VIOLATED: CompletionAuditor cannot change project rules');
  }

  /**
   * HARD PROHIBITION: This method must never be implemented
   */
  private async inventDecision(): Promise<never> {
    throw new Error('PROHIBITION VIOLATED: CompletionAuditor cannot invent decisions');
  }
}
