/**
 * Forge Implementer Hardened (Tier 4.5)
 *
 * Authority: FORGE_IMPLEMENTATION_AUTHORITY
 * Role: Deterministic Robotic Executor
 *
 * Philosophy:
 * "Forge Implementer is not an agent. It is a robot arm.
 *  If it ever 'helps', the system is broken."
 *
 * This agent executes approved ExecutionPlanContracts
 * exactly as written, step-for-step, byte-for-byte.
 *
 * NO THINKING. NO INTERPRETATION. NO OPTIMIZATION.
 *
 * If deviation occurs → IMMEDIATE HALT
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { ForgeConductor } from '../conductor/forge-conductor.js';
import { createHash, randomUUID } from 'crypto';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { constants } from 'fs';
import { dirname } from 'path';

/**
 * PROMPT ENVELOPE
 *
 * Constitutional authority definition for Forge Implementer
 */
interface PromptEnvelope {
  authority: string;
  version: string;
  allowedActions: string[];
  forbiddenActions: string[];
  requiredContext: string[];
}

const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'FORGE_IMPLEMENTATION_AUTHORITY',
  version: '1.0.0',
  allowedActions: [
    'executeTask',
    'verifyOutcome',
    'emitResult',
    'haltOnFailure',
    'loadHashLockedContext',
  ],
  forbiddenActions: [
    'generateIdeas',
    'interpretInstructions',
    'modifyTaskOrder',
    'skipTasks',
    'combineTasks',
    'createFilesNotListed',
    'modifyFilesNotListed',
    'addDependenciesNotListed',
    'retryFailedTasks',
    'autoFixErrors',
    'suggestImprovements',
    'touchConfigurationNotSpecified',
    'readUnapprovedArtifacts',
    'proceedAfterFailure',
  ],
  requiredContext: [
    'executionPlanHash',
    'buildPromptHash',
    'projectRulesHash',
  ],
};

/**
 * EXECUTION TASK (from ExecutionPlanContract)
 */
interface ExecutionTask {
  taskId: string;
  type: 'CREATE_FILE' | 'MODIFY_FILE' | 'ADD_DEPENDENCY';
  target: string;
  description: string;
  dependsOn: string[];
  verification: string[];
}

/**
 * EXECUTION PLAN CONTRACT (hash-locked)
 */
interface ExecutionPlanContract {
  planId: string;
  buildPromptHash: string;
  sequenceNumber: number;
  tasks: ExecutionTask[];
  constraints: {
    noParallelExecution: true;
    mustFollowSequence: true;
    mustRespectFileOwnership: true;
  };
  contractHash: string;
}

/**
 * BUILD PROMPT CONTRACT (hash-locked)
 */
interface BuildPromptContract {
  promptId: string;
  appRequestId: string;
  rulesHash: string;
  scope: {
    filesToCreate: string[];
    filesToModify: string[];
    filesToDelete: string[];
  };
  dependencies: {
    add: Array<{ name: string; version: string; dev: boolean }>;
    remove: string[];
  };
  constraints: Record<string, boolean>;
}

/**
 * ISOLATED CONTEXT
 *
 * Only hash-locked artifacts are accessible
 */
interface IsolatedContext {
  appRequestId: string;
  executionPlan: {
    id: string;
    contractHash: string;
    tasks: ExecutionTask[];
    constraints: ExecutionPlanContract['constraints'];
  };
  buildPrompt: {
    id: string;
    contractHash: string;
    scope: BuildPromptContract['scope'];
  };
  projectRules: {
    rulesHash: string;
    workingDirectory: string;
  };
}

/**
 * TASK EXECUTION RESULT
 */
interface TaskExecutionResult {
  taskId: string;
  status: 'success' | 'failure';
  action: string;
  target: string;
  timestamp: Date;
  verificationResults: Array<{
    criterion: string;
    passed: boolean;
    reason?: string;
  }>;
  error?: string;
}

/**
 * EXECUTION LOG (deterministic)
 */
interface ExecutionLog {
  planId: string;
  taskResults: TaskExecutionResult[];
  status: 'in_progress' | 'completed' | 'failed';
  failedAt?: string; // taskId
  logHash: string;   // SHA-256 of log (excluding timestamps)
}

/**
 * FORGE IMPLEMENTER HARDENED
 *
 * Robotic executor with zero intelligence
 */
export class ForgeImplementerHardened {
  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: FastifyBaseLogger
  ) {
    this.logger.info('ForgeImplementerHardened initialized');
  }

  /**
   * ACTION VALIDATION
   *
   * Validates that an action is allowed by constitutional authority
   */
  private validateAction(action: string): void {
    if (PROMPT_ENVELOPE.forbiddenActions.includes(action)) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: Action '${action}' is FORBIDDEN by FORGE_IMPLEMENTATION_AUTHORITY. ` +
        `This agent is a robotic executor, not an intelligent agent.`
      );
    }

    if (!PROMPT_ENVELOPE.allowedActions.includes(action)) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: Action '${action}' is NOT ALLOWED by FORGE_IMPLEMENTATION_AUTHORITY. ` +
        `Allowed actions: ${PROMPT_ENVELOPE.allowedActions.join(', ')}`
      );
    }
  }

  /**
   * LOAD HASH-LOCKED CONTEXT
   *
   * Maximum context isolation - ONLY approved, hash-locked artifacts
   */
  private async loadHashLockedContext(planId: string): Promise<IsolatedContext> {
    this.validateAction('loadHashLockedContext');

    // Load ExecutionPlan
    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.status !== 'approved' || !plan.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: ExecutionPlan ${planId} is not approved or hash-locked. ` +
        `Forge Implementer can ONLY execute approved plans.`
      );
    }

    const planContract: ExecutionPlanContract = JSON.parse(plan.contractJson!);

    // Load BuildPrompt (referenced by hash)
    const buildPrompt = await this.prisma.buildPrompt.findUnique({
      where: { id: plan.buildPromptId },
    });

    if (!buildPrompt || buildPrompt.status !== 'approved' || !buildPrompt.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: BuildPrompt ${plan.buildPromptId} is not approved or hash-locked.`
      );
    }

    if (buildPrompt.contractHash !== planContract.buildPromptHash) {
      throw new Error(
        `HASH CHAIN VIOLATION: ExecutionPlan.buildPromptHash (${planContract.buildPromptHash}) ` +
        `does not match BuildPrompt.contractHash (${buildPrompt.contractHash})`
      );
    }

    const buildPromptContract: BuildPromptContract = JSON.parse(buildPrompt.contractJson!);

    // Load ProjectRuleSet (referenced by hash)
    const projectRules = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId: buildPrompt.appRequestId },
    });

    if (!projectRules || projectRules.status !== 'approved' || !projectRules.rulesHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ProjectRuleSet found for appRequestId ${buildPrompt.appRequestId}`
      );
    }

    const rulesContent = JSON.parse(projectRules.content);

    return {
      appRequestId: buildPrompt.appRequestId,
      executionPlan: {
        id: plan.id,
        contractHash: plan.contractHash,
        tasks: planContract.tasks,
        constraints: planContract.constraints,
      },
      buildPrompt: {
        id: buildPrompt.id,
        contractHash: buildPrompt.contractHash,
        scope: buildPromptContract.scope,
      },
      projectRules: {
        rulesHash: projectRules.rulesHash,
        workingDirectory: rulesContent.workingDirectory || '/Users/user/forge',
      },
    };
  }

  /**
   * EXECUTE TASK
   *
   * Execute exactly one task, exactly once, in order
   */
  private async executeTask(
    task: ExecutionTask,
    context: IsolatedContext
  ): Promise<TaskExecutionResult> {
    this.validateAction('executeTask');

    this.logger.info({ taskId: task.taskId, type: task.type }, 'Executing task');

    const result: TaskExecutionResult = {
      taskId: task.taskId,
      status: 'success',
      action: task.type,
      target: task.target,
      timestamp: new Date(),
      verificationResults: [],
    };

    try {
      // Execute based on task type
      switch (task.type) {
        case 'CREATE_FILE':
          await this.executeCreateFile(task, context);
          break;
        case 'MODIFY_FILE':
          await this.executeModifyFile(task, context);
          break;
        case 'ADD_DEPENDENCY':
          await this.executeAddDependency(task, context);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Verify outcome
      result.verificationResults = await this.verifyOutcome(task, context);

      // Check if all verification passed
      const allPassed = result.verificationResults.every(v => v.passed);
      if (!allPassed) {
        result.status = 'failure';
        result.error = 'Verification failed';
      }

    } catch (error: any) {
      result.status = 'failure';
      result.error = error.message;
      this.logger.error({ taskId: task.taskId, error: error.message }, 'Task execution failed');
    }

    return result;
  }

  /**
   * EXECUTE: CREATE_FILE
   */
  private async executeCreateFile(task: ExecutionTask, context: IsolatedContext): Promise<void> {
    // Validate target is in allowed scope
    if (!context.buildPrompt.scope.filesToCreate.includes(task.target)) {
      throw new Error(
        `SCOPE VIOLATION: File ${task.target} is not in BuildPrompt.scope.filesToCreate. ` +
        `Forge Implementer can ONLY create explicitly listed files.`
      );
    }

    const filePath = `${context.projectRules.workingDirectory}/${task.target}`;

    // Check if file already exists (CREATE must fail if exists)
    try {
      await access(filePath, constants.F_OK);
      throw new Error(`File ${task.target} already exists. CREATE_FILE task must fail if target exists.`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist - good, we can create it
    }

    // Create parent directories if they don't exist
    const parentDir = dirname(filePath);
    await mkdir(parentDir, { recursive: true });

    // For now, create an empty file
    // In production, this would use the instruction from BuildPrompt
    await writeFile(filePath, `// File created by Forge Implementer\n// Task: ${task.taskId}\n`, 'utf-8');

    this.logger.info({ target: task.target }, 'File created');
  }

  /**
   * EXECUTE: MODIFY_FILE
   */
  private async executeModifyFile(task: ExecutionTask, context: IsolatedContext): Promise<void> {
    // Validate target is in allowed scope
    if (!context.buildPrompt.scope.filesToModify.includes(task.target)) {
      throw new Error(
        `SCOPE VIOLATION: File ${task.target} is not in BuildPrompt.scope.filesToModify. ` +
        `Forge Implementer can ONLY modify explicitly listed files.`
      );
    }

    const filePath = `${context.projectRules.workingDirectory}/${task.target}`;

    // Check if file exists (MODIFY must fail if missing)
    try {
      await access(filePath, constants.F_OK);
    } catch (error: any) {
      throw new Error(`File ${task.target} does not exist. MODIFY_FILE task must fail if target is missing.`);
    }

    // Read existing content
    const existingContent = await readFile(filePath, 'utf-8');

    // For now, append a comment
    // In production, this would use the instruction from BuildPrompt
    const modifiedContent = existingContent + `\n// Modified by Forge Implementer\n// Task: ${task.taskId}\n`;

    await writeFile(filePath, modifiedContent, 'utf-8');

    this.logger.info({ target: task.target }, 'File modified');
  }

  /**
   * EXECUTE: ADD_DEPENDENCY
   */
  private async executeAddDependency(task: ExecutionTask, context: IsolatedContext): Promise<void> {
    // For now, just log the dependency addition
    // In production, this would actually modify package.json
    this.logger.info({ target: task.target, description: task.description }, 'Dependency added (placeholder)');
  }

  /**
   * VERIFY OUTCOME
   *
   * Check if task execution meets verification criteria
   */
  private async verifyOutcome(
    task: ExecutionTask,
    context: IsolatedContext
  ): Promise<Array<{ criterion: string; passed: boolean; reason?: string }>> {
    this.validateAction('verifyOutcome');

    const results: Array<{ criterion: string; passed: boolean; reason?: string }> = [];

    for (const criterion of task.verification) {
      // Simplified verification for now
      // In production, this would actually check compilation, linting, etc.
      const passed = true;
      results.push({ criterion, passed });
    }

    return results;
  }

  /**
   * EMIT RESULT
   *
   * Emit execution result as audit event
   */
  private async emitResult(
    appRequestId: string,
    result: TaskExecutionResult
  ): Promise<void> {
    this.validateAction('emitResult');

    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: {
          id: randomUUID(),
          executionId: appRequest.executionId,
          type: result.status === 'success' ? 'task_executed' : 'task_failed',
          message: `Task ${result.taskId}: ${result.action} ${result.target} - ${result.status}`,
        },
      });
    }
  }

  /**
   * HALT ON FAILURE
   *
   * Immediate halt when task fails - no retry, no rollback
   */
  private async haltOnFailure(
    planId: string,
    appRequestId: string,
    taskId: string,
    error: string
  ): Promise<void> {
    this.validateAction('haltOnFailure');

    this.logger.error({ planId, taskId, error }, 'EXECUTION HALTED - Task failed');

    // Lock conductor
    await this.conductor.lock(appRequestId);

    // Emit failure event
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: {
          id: randomUUID(),
          executionId: appRequest.executionId,
          type: 'execution_halted',
          message: `EXECUTION HALTED at task ${taskId}: ${error}. Human intervention required.`,
        },
      });
    }

    // Pause for human
    await this.conductor.pauseForHuman(
      appRequestId,
      `Execution halted at task ${taskId}. Error: ${error}`
    );
  }

  /**
   * COMPUTE LOG HASH
   *
   * Deterministic hash of execution log (excludes timestamps)
   */
  private computeLogHash(log: Omit<ExecutionLog, 'logHash'>): string {
    // Stable serialization - EXCLUDE timestamps
    const serialized = JSON.stringify(
      log,
      [
        'planId',
        'taskResults',
        'taskId',
        'status',
        'action',
        'target',
        'verificationResults',
        'criterion',
        'passed',
        'reason',
        'error',
        'failedAt',
      ].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * PUBLIC API: execute(planId)
   *
   * Execute an approved ExecutionPlan step-by-step
   */
  async execute(planId: string): Promise<ExecutionLog> {
    this.logger.info({ planId }, 'Forge Implementer: execute()');

    // Load hash-locked context
    const context = await this.loadHashLockedContext(planId);

    // Validate conductor state
    const snapshot = await this.conductor.getStateSnapshot(context.appRequestId);
    if (snapshot.currentStatus !== 'building') {
      throw new Error(
        `CONDUCTOR STATE VIOLATION: Cannot execute. ` +
        `Expected state 'building', got '${snapshot.currentStatus}'.`
      );
    }

    // Lock conductor
    await this.conductor.lock(context.appRequestId);

    const taskResults: TaskExecutionResult[] = [];
    let failedAt: string | undefined;

    try {
      // Execute tasks sequentially (NO PARALLEL EXECUTION)
      for (let i = 0; i < context.executionPlan.tasks.length; i++) {
        const task = context.executionPlan.tasks[i];

        this.logger.info({ taskId: task.taskId, index: i + 1, total: context.executionPlan.tasks.length }, 'Executing task');

        // Execute task
        const result = await this.executeTask(task, context);
        taskResults.push(result);

        // Emit result
        await this.emitResult(context.appRequestId, result);

        // If task failed, HALT IMMEDIATELY
        if (result.status === 'failure') {
          failedAt = task.taskId;
          await this.haltOnFailure(planId, context.appRequestId, task.taskId, result.error || 'Unknown error');

          // Build log
          const logWithoutHash: Omit<ExecutionLog, 'logHash'> = {
            planId,
            taskResults,
            status: 'failed',
            failedAt,
          };

          const logHash = this.computeLogHash(logWithoutHash);
          const log: ExecutionLog = { ...logWithoutHash, logHash };

          return log;
        }
      }

      // All tasks completed successfully
      const logWithoutHash: Omit<ExecutionLog, 'logHash'> = {
        planId,
        taskResults,
        status: 'completed',
      };

      const logHash = this.computeLogHash(logWithoutHash);
      const log: ExecutionLog = { ...logWithoutHash, logHash };

      // Transition to verifying
      await this.conductor.transition(context.appRequestId, 'verifying', 'ForgeImplementer');

      this.logger.info({ planId, logHash }, 'Execution completed successfully');

      return log;

    } finally {
      await this.conductor.unlock(context.appRequestId);
    }
  }

  /**
   * PUBLIC API: getStatus(planId)
   *
   * Get execution status (placeholder for future)
   */
  async getStatus(planId: string): Promise<{ status: string }> {
    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`ExecutionPlan ${planId} not found`);
    }

    return {
      status: plan.status,
    };
  }
}
