/**
 * REPAIR AGENT HARDENED (TIER 5.75)
 *
 * Constitutional Role: Bounded Repair Executor
 * Authority: REPAIR_EXECUTION_AUTHORITY
 * Intelligence: ZERO (mechanical execution only)
 * Autonomy: ZERO (no decisions)
 * Execution Power: BOUNDED (only approved RepairPlan actions)
 *
 * Philosophy:
 * "The Repair Agent is a torque wrench, not a mechanic."
 *
 * This agent executes ONLY human-approved RepairPlan actions.
 * It makes NO decisions, NO interpretations, NO suggestions.
 * It halts immediately on ANY deviation.
 *
 * CRITICAL SAFETY INVARIANT:
 * Even if a malicious, buggy, or over-eager LLM were plugged in,
 * the system would still be safe because:
 * - All inputs are hash-locked and human-approved
 * - All operations are explicitly bounded
 * - Any deviation triggers immediate halt
 * - No retry or recovery logic exists
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { ForgeConductor } from '../conductor/forge-conductor.js';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * PROMPT ENVELOPE (CONSTITUTIONAL CONSTRAINTS)
 */
interface PromptEnvelope {
  authority: 'REPAIR_EXECUTION_AUTHORITY';
  tier: 5.75;
  intelligenceLevel: 'ZERO'; // Mechanical execution only
  autonomy: 'NONE'; // No decisions
  executionPower: 'BOUNDED'; // Only approved actions
  defaultState: 'DISABLED';
  allowedActions: string[];
  forbiddenActions: string[];
}

/**
 * REPAIR ACTION (FROM APPROVED REPAIRPLAN)
 */
interface RepairAction {
  actionId: string;
  targetFile: string; // Relative path from workspace
  operation: 'replace_lines' | 'replace_content' | 'append';
  allowedLineRange?: [number, number]; // For line-based operations
  oldContent?: string; // For content-based operations
  newContent: string; // What to write
  description: string; // Human-facing only (not used by agent)
}

/**
 * APPROVED REPAIRPLAN (HUMAN-AUTHORIZED)
 */
interface ApprovedRepairPlan {
  repairPlanId: string;
  repairPlanHash: string; // SHA-256 of approved plan
  sourceVerificationHash: string; // Hash of FAILED VerificationResult
  actions: RepairAction[];
  allowedFiles: string[]; // Whitelist
  constraints: {
    noNewFiles: boolean;
    noNewDependencies: boolean;
    noScopeExpansion: boolean;
  };
  approvedBy: 'human'; // MUST be human
  approvedAt: string; // ISO timestamp
}

/**
 * REPAIR EXECUTION LOG (IMMUTABLE OUTPUT)
 */
export interface RepairExecutionLog {
  executionId: string;
  repairPlanHash: string;
  actionsExecuted: string[]; // Action IDs executed
  filesTouched: string[]; // Files modified
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  executedAt: string; // ISO timestamp
  executionHash: string; // SHA-256 (excludes executedAt)
}

/**
 * REPAIR AGENT HARDENED
 *
 * This agent is intentionally neutered to be LESS powerful than
 * Forge Implementer. It is a purely bounded executor.
 */
export class RepairAgentHardened {
  name = 'RepairAgentHardened';

  private envelope: PromptEnvelope = {
    authority: 'REPAIR_EXECUTION_AUTHORITY',
    tier: 5.75,
    intelligenceLevel: 'ZERO',
    autonomy: 'NONE',
    executionPower: 'BOUNDED',
    defaultState: 'DISABLED',
    allowedActions: [
      'readApprovedRepairPlan',
      'readFailedVerificationResult',
      'readHashApprovedBuildPrompt',
      'readHashApprovedExecutionPlan',
      'readHashApprovedProjectRuleSet',
      'validateAllHashes',
      'lockConductor',
      'executeRepairAction',
      'verifyFileExists',
      'verifyFileInAllowedList',
      'verifyLineRange',
      'applyExactChange',
      'emitExecutionLog',
      'unlockConductor',
    ],
    forbiddenActions: [
      'generateCode',
      'suggestFixes',
      'expandScope',
      'retryOnFailure',
      'modifyUnapprovedFiles',
      'addNewFiles',
      'addDependencies',
      'interpretIntent',
      'rewriteEntireFiles',
      'fixRelatedIssues',
      'touchFormatting',
      'decideIfGoodEnough',
      'retryVerification',
      'rollbackOnFailure',
      'continueAfterError',
      'modifyOutsideLineRange',
      'chooseAlternativeActions',
      'optimizeCode',
      'refactor',
      'addComments',
      'addLogging',
      'addErrorHandling',
    ],
  };

  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: Logger
  ) {
    this.logger.info({ agent: this.name }, `${this.name} initialized`);
  }

  /**
   * EXECUTE REPAIR
   *
   * This is the ONLY public method. It executes an approved RepairPlan
   * with ZERO interpretation and ZERO autonomy.
   *
   * @param appRequestId - The application request ID
   * @param repairPlan - Human-approved RepairPlan
   * @param workspaceDir - Workspace directory (from ProjectRuleSet)
   * @returns RepairExecutionLog (hash-locked, immutable)
   * @throws Error on ANY deviation or violation
   */
  async execute(
    appRequestId: string,
    repairPlan: ApprovedRepairPlan,
    workspaceDir: string
  ): Promise<RepairExecutionLog> {
    this.logger.info({ appRequestId, repairPlanId: repairPlan.repairPlanId }, 'Starting repair execution');

    // PHASE 1: VALIDATE ALL PRECONDITIONS (HARD REQUIREMENTS)
    // These throw immediately - no execution log is created
    await this.validatePreconditions(appRequestId, repairPlan);

    // PHASE 2: VALIDATE ACTION STRUCTURE (BEFORE LOCKING)
    // These throw immediately if the RepairPlan structure is invalid
    for (const action of repairPlan.actions) {
      this.validateActionStructure(action, repairPlan, workspaceDir);
    }

    // PHASE 3: LOCK CONDUCTOR (PREVENT CONCURRENT MODIFICATIONS)
    await this.lockConductor(appRequestId);

    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let failureReason: string | undefined;
    const actionsExecuted: string[] = [];
    const filesTouched: string[] = [];

    try {
      // PHASE 4: VALIDATE AND EXECUTE EACH ACTION (IN ORDER, NO PARALLELISM)
      // Content validation errors (oldContent not found) are caught and result in FAILED status
      for (const action of repairPlan.actions) {
        this.validateActionContent(action, workspaceDir);
      }

      // PHASE 4: EXECUTE EACH ACTION (IN ORDER, NO PARALLELISM)
      for (const action of repairPlan.actions) {
        this.logger.info(
          { actionId: action.actionId, targetFile: action.targetFile },
          'Executing repair action'
        );

        // Execute action (EXACTLY as specified)
        await this.executeAction(action, workspaceDir);

        // Record action
        actionsExecuted.push(action.actionId);
        if (!filesTouched.includes(action.targetFile)) {
          filesTouched.push(action.targetFile);
        }

        this.logger.info({ actionId: action.actionId }, 'Repair action applied');
      }

      this.logger.info({ actionsExecuted: actionsExecuted.length }, 'All repair actions executed successfully');
    } catch (error: any) {
      // ANY error during validation or execution triggers immediate halt
      status = 'FAILED';
      failureReason = error.message;

      this.logger.error(
        { error: error.message, actionsExecuted: actionsExecuted.length },
        'Repair execution FAILED - halting immediately'
      );

      // DO NOT RETRY
      // DO NOT ROLLBACK
      // DO NOT CONTINUE
      // Failure is informational, not recoverable
    } finally {
      // PHASE 5: UNLOCK CONDUCTOR (ALWAYS)
      await this.unlockConductor(appRequestId);
    }

    // PHASE 5: BUILD EXECUTION LOG (IMMUTABLE)
    const executionLog = this.buildExecutionLog(
      repairPlan,
      actionsExecuted,
      filesTouched,
      status,
      failureReason
    );

    // PHASE 6: EMIT EVENT
    await this.emitExecutionEvent(appRequestId, executionLog);

    this.logger.info(
      { executionId: executionLog.executionId, status: executionLog.status },
      'Repair execution complete'
    );

    return executionLog;
  }

  /**
   * PHASE 1: VALIDATE PRECONDITIONS
   *
   * ALL inputs must be:
   * - Present
   * - Approved
   * - Hash-locked
   *
   * If ANY requirement fails → HALT
   */
  private async validatePreconditions(
    appRequestId: string,
    repairPlan: ApprovedRepairPlan
  ): Promise<void> {
    // 1. RepairPlan must be human-approved
    if (repairPlan.approvedBy !== 'human') {
      throw new Error(
        `PRECONDITION VIOLATION: RepairPlan must be approved by human, got ${repairPlan.approvedBy}`
      );
    }

    // 2. RepairPlan must have hash
    if (!repairPlan.repairPlanHash) {
      throw new Error('PRECONDITION VIOLATION: RepairPlan missing hash');
    }

    // 3. RepairPlan must reference a FAILED VerificationResult
    const verificationResult = await this.prisma.verificationResult.findFirst({
      where: {
        appRequestId,
        resultHash: repairPlan.sourceVerificationHash,
      },
    });

    if (!verificationResult) {
      throw new Error(
        `PRECONDITION VIOLATION: No VerificationResult found with hash ${repairPlan.sourceVerificationHash}`
      );
    }

    if (verificationResult.overallStatus !== 'FAILED') {
      throw new Error(
        `PRECONDITION VIOLATION: VerificationResult must be FAILED, got ${verificationResult.overallStatus}`
      );
    }

    // 4. BuildPrompt must exist and be approved
    const buildPrompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: 'approved' },
    });

    if (!buildPrompt) {
      throw new Error('PRECONDITION VIOLATION: No approved BuildPrompt found');
    }

    if (!buildPrompt.contractHash) {
      throw new Error('PRECONDITION VIOLATION: BuildPrompt missing hash');
    }

    // 5. ExecutionPlan must exist and be approved
    const executionPlan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId, status: 'approved' },
    });

    if (!executionPlan) {
      throw new Error('PRECONDITION VIOLATION: No approved ExecutionPlan found');
    }

    if (!executionPlan.contractHash) {
      throw new Error('PRECONDITION VIOLATION: ExecutionPlan missing hash');
    }

    // 6. ProjectRuleSet must exist and be approved
    const projectRules = await this.prisma.projectRuleSet.findFirst({
      where: { appRequestId, status: 'approved' },
    });

    if (!projectRules) {
      throw new Error('PRECONDITION VIOLATION: No approved ProjectRuleSet found');
    }

    if (!projectRules.rulesHash) {
      throw new Error('PRECONDITION VIOLATION: ProjectRuleSet missing hash');
    }

    // 7. Conductor must NOT be locked
    const conductorState = await this.prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (conductorState?.locked) {
      throw new Error('PRECONDITION VIOLATION: Conductor is locked');
    }

    this.logger.debug({ appRequestId }, 'All preconditions validated');
  }

  /**
   * VALIDATE ACTION STRUCTURE
   *
   * Validates the structural aspects of the action (file permissions, line ranges).
   * Throws immediately if invalid - this happens BEFORE locking the conductor.
   */
  private validateActionStructure(
    action: RepairAction,
    repairPlan: ApprovedRepairPlan,
    workspaceDir: string
  ): void {
    // 1. File must be in allowed list
    if (!repairPlan.allowedFiles.includes(action.targetFile)) {
      throw new Error(
        `ACTION VIOLATION: File ${action.targetFile} not in allowed list: ${repairPlan.allowedFiles.join(', ')}`
      );
    }

    // 2. File must exist (no new files)
    const filePath = path.join(workspaceDir, action.targetFile);
    if (!fs.existsSync(filePath)) {
      if (repairPlan.constraints.noNewFiles) {
        throw new Error(`ACTION VIOLATION: File ${action.targetFile} does not exist (noNewFiles constraint)`);
      }
    }

    // 3. Operation must be valid
    const validOperations = ['replace_lines', 'replace_content', 'append'];
    if (!validOperations.includes(action.operation)) {
      throw new Error(`ACTION VIOLATION: Invalid operation ${action.operation}`);
    }

    // 4. Validate line range (if operation is replace_lines)
    if (action.operation === 'replace_lines') {
      if (!action.allowedLineRange) {
        throw new Error('ACTION VIOLATION: replace_lines requires allowedLineRange');
      }

      // Read file to check line count
      const currentContent = fs.readFileSync(filePath, 'utf-8');
      const lines = currentContent.split('\n');
      const [startLine, endLine] = action.allowedLineRange;

      if (startLine < 1 || endLine > lines.length) {
        throw new Error(
          `ACTION VIOLATION: Line range [${startLine}, ${endLine}] out of bounds (file has ${lines.length} lines)`
        );
      }
    }

    this.logger.debug({ actionId: action.actionId }, 'Action structure validated');
  }

  /**
   * VALIDATE ACTION CONTENT
   *
   * Validates the content aspects of the action (oldContent exists).
   * Throws if invalid - but this is caught and results in FAILED status.
   */
  private validateActionContent(action: RepairAction, workspaceDir: string): void {
    const filePath = path.join(workspaceDir, action.targetFile);

    // Validate oldContent exists (if operation is replace_content)
    if (action.operation === 'replace_content') {
      if (action.oldContent === undefined) {
        throw new Error('ACTION VIOLATION: replace_content requires oldContent');
      }

      const currentContent = fs.readFileSync(filePath, 'utf-8');
      if (!currentContent.includes(action.oldContent)) {
        throw new Error(
          `ACTION VIOLATION: oldContent not found in ${action.targetFile}. ` +
            `Expected to find: "${action.oldContent.substring(0, 100)}..."`
        );
      }
    }

    this.logger.debug({ actionId: action.actionId }, 'Action content validated');
  }

  /**
   * EXECUTE ACTION
   *
   * Apply EXACTLY the specified change. NO interpretation.
   */
  private async executeAction(action: RepairAction, workspaceDir: string): Promise<void> {
    const filePath = path.join(workspaceDir, action.targetFile);

    // Read current content
    const currentContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

    let newContent: string;

    switch (action.operation) {
      case 'replace_content':
        // Replace exact old content with new content
        if (action.oldContent === undefined) {
          throw new Error('ACTION VIOLATION: replace_content requires oldContent');
        }

        if (!currentContent.includes(action.oldContent)) {
          throw new Error(
            `ACTION VIOLATION: oldContent not found in ${action.targetFile}. ` +
              `Expected to find: "${action.oldContent.substring(0, 100)}..."`
          );
        }

        newContent = currentContent.replace(action.oldContent, action.newContent);
        break;

      case 'append':
        // Append to end of file
        newContent = currentContent + action.newContent;
        break;

      case 'replace_lines':
        // Replace specific line range
        if (!action.allowedLineRange) {
          throw new Error('ACTION VIOLATION: replace_lines requires allowedLineRange');
        }

        const lines = currentContent.split('\n');
        const [startLine, endLine] = action.allowedLineRange;

        if (startLine < 1 || endLine > lines.length) {
          throw new Error(
            `ACTION VIOLATION: Line range [${startLine}, ${endLine}] out of bounds (file has ${lines.length} lines)`
          );
        }

        // Replace lines (1-indexed)
        const newLines = action.newContent.split('\n');
        lines.splice(startLine - 1, endLine - startLine + 1, ...newLines);
        newContent = lines.join('\n');
        break;

      default:
        throw new Error(`ACTION VIOLATION: Unknown operation ${action.operation}`);
    }

    // Write new content
    fs.writeFileSync(filePath, newContent, 'utf-8');

    this.logger.debug({ targetFile: action.targetFile }, 'File modified');
  }

  /**
   * LOCK CONDUCTOR
   */
  private async lockConductor(appRequestId: string): Promise<void> {
    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: { locked: true },
    });

    this.logger.debug({ appRequestId }, 'Conductor locked');
  }

  /**
   * UNLOCK CONDUCTOR
   */
  private async unlockConductor(appRequestId: string): Promise<void> {
    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: { locked: false },
    });

    this.logger.debug({ appRequestId }, 'Conductor unlocked');
  }

  /**
   * BUILD EXECUTION LOG (IMMUTABLE)
   */
  private buildExecutionLog(
    repairPlan: ApprovedRepairPlan,
    actionsExecuted: string[],
    filesTouched: string[],
    status: 'SUCCESS' | 'FAILED',
    failureReason?: string
  ): RepairExecutionLog {
    const executionId = `repair-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const logWithoutHash: Omit<RepairExecutionLog, 'executionHash'> = {
      executionId,
      repairPlanHash: repairPlan.repairPlanHash,
      actionsExecuted,
      filesTouched,
      status,
      failureReason,
      executedAt: new Date().toISOString(),
    };

    // Compute hash (excludes executedAt for determinism)
    const executionHash = this.computeExecutionHash(logWithoutHash);

    return { ...logWithoutHash, executionHash };
  }

  /**
   * COMPUTE EXECUTION HASH (DETERMINISTIC)
   *
   * Excludes timestamp to ensure same repair produces same hash
   */
  private computeExecutionHash(log: Omit<RepairExecutionLog, 'executionHash'>): string {
    const serialized = JSON.stringify(
      log,
      ['executionId', 'repairPlanHash', 'actionsExecuted', 'filesTouched', 'status', 'failureReason'].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * EMIT EXECUTION EVENT
   *
   * Log the repair execution event (not persisted to database)
   */
  private async emitExecutionEvent(appRequestId: string, log: RepairExecutionLog): Promise<void> {
    const eventType = log.status === 'SUCCESS' ? 'repair_execution_completed' : 'repair_execution_failed';

    this.logger.info(
      {
        appRequestId,
        eventType,
        executionId: log.executionId,
        repairPlanHash: log.repairPlanHash.substring(0, 16) + '...',
        actionsExecuted: log.actionsExecuted,
        filesTouched: log.filesTouched,
        executionHash: log.executionHash.substring(0, 16) + '...',
        status: log.status,
        failureReason: log.failureReason,
      },
      'Repair execution event'
    );
  }
}
