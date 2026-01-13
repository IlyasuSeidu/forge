/**
 * Execution Planner Hardened - Production Hardening (January 13, 2026)
 *
 * Constitutional Authority: EXECUTION_PLANNING_AUTHORITY (Tier 4.25)
 *
 * PURPOSE:
 * Converts approved BuildPromptContracts into strict, ordered, executable task plans.
 * This agent is a Factory Line Controller - NO THINKING, NO OPTIMIZATION, NO IMPLEMENTATION.
 *
 * It answers ONLY one question:
 * "What exact task happens next?"
 *
 * Not how. Not why. Not could we.
 *
 * FORBIDDEN ACTIONS:
 * - Write code
 * - Modify code
 * - Generate prompts
 * - Combine steps
 * - Reorder steps
 * - Optimize task flow
 * - Skip tasks
 * - Invent tasks
 * - Retry failed tasks
 * - Infer missing context
 * - Reference non-hash-approved artifacts
 *
 * ALLOWED ACTIONS:
 * - Generate execution plan
 * - Validate plan contract
 * - Track task dependencies
 * - Emit events
 * - Pause for approval
 *
 * If tempted to "think" → HALT
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from '../conductor/forge-conductor.js';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

/**
 * PHASE 1: PROMPT ENVELOPE (CONSTITUTIONAL FOUNDATION)
 */

interface PromptEnvelope {
  authority: 'EXECUTION_PLANNING_AUTHORITY';
  version: '1.0.0';
  allowedActions: string[];
  forbiddenActions: string[];
  requiredContext: string[];
}

const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'EXECUTION_PLANNING_AUTHORITY',
  version: '1.0.0',
  allowedActions: [
    'generateExecutionPlan',
    'validatePlanContract',
    'trackTaskDependencies',
    'emitEvents',
    'pauseForApproval',
  ],
  forbiddenActions: [
    'writeCode',
    'modifyCode',
    'generatePrompts',
    'combineSteps',
    'reorderSteps',
    'optimizeTaskFlow',
    'skipTasks',
    'inventTasks',
    'retryFailedTasks',
    'inferMissingContext',
    'referenceNonHashApproved',
  ],
  requiredContext: [
    'buildPromptHash',      // Must have approved BuildPrompt
    'projectRuleSetHash',   // Must have tech stack info
  ],
};

/**
 * EXECUTION PLAN CONTRACT (STRICT SCHEMA)
 */

export interface ExecutionPlanContract {
  planId: string;                    // UUID
  buildPromptHash: string;           // Reference to approved BuildPrompt
  sequenceNumber: number;            // 0-based (1 plan per BuildPrompt currently)
  tasks: ExecutionTask[];
  constraints: {
    noParallelExecution: true;
    mustFollowSequence: true;
    mustRespectFileOwnership: true;
  };
  contractHash: string;              // SHA-256
}

export interface ExecutionTask {
  taskId: string;                    // "task-0", "task-1", etc. (deterministic)
  type: 'CREATE_FILE' | 'MODIFY_FILE' | 'ADD_DEPENDENCY';
  target: string;                    // File path or dependency name
  description: string;               // WHAT to do, never HOW
  dependsOn: string[];               // taskIds (topologically sorted)
  verification: string[];            // Machine-checkable criteria
}

/**
 * ISOLATED CONTEXT (HASH-LOCKED ONLY)
 */

interface IsolatedContext {
  appRequestId: string;
  buildPrompt: {
    id: string;
    contractHash: string;
    scope: {
      filesToCreate: string[];
      filesToModify: string[];
      filesForbidden: string[];
    };
    dependencies: {
      add: string[];
    };
  };
  projectRules: {
    rulesHash: string;
    techStack: { framework: string; language: string; database?: string; };
  };
}

/**
 * TECH STACK (for context)
 */

interface TechStack {
  framework: string;
  language: string;
  database?: string;
}

/**
 * PLAN STATUS (3-State Lifecycle)
 */

const PlanStatus = {
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

/**
 * EXECUTION PLANNER HARDENED CLASS
 */

export class ExecutionPlannerHardened {
  private readonly envelope = PROMPT_ENVELOPE;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly conductor: ForgeConductor,
    private readonly logger: Logger
  ) {}

  /**
   * ACTION VALIDATION (Constitutional Enforcement)
   */
  private validateAction(action: string): void {
    if (this.envelope.forbiddenActions.includes(action)) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: Action "${action}" is FORBIDDEN by ` +
          `${this.envelope.authority}. This agent is a Factory Line Controller. ` +
          `It does NOT: think, optimize, implement, retry, or infer.`
      );
    }

    if (!this.envelope.allowedActions.includes(action)) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: Action "${action}" is NOT in allowed list. ` +
          `Allowed: ${this.envelope.allowedActions.join(', ')}`
      );
    }
  }

  /**
   * CONTEXT ISOLATION (Hash-Based Artifact Access Only)
   */
  private async loadIsolatedContext(buildPromptId: string): Promise<IsolatedContext> {
    this.validateAction('generateExecutionPlan');

    // Load approved BuildPrompt
    const buildPrompt = await this.prisma.buildPrompt.findUnique({
      where: { id: buildPromptId },
    });

    if (!buildPrompt) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: BuildPrompt ${buildPromptId} not found.`
      );
    }

    if (buildPrompt.status !== PlanStatus.APPROVED) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: BuildPrompt ${buildPromptId} is not approved ` +
          `(status: ${buildPrompt.status}). Execution Planner requires hash-locked BuildPrompts.`
      );
    }

    if (!buildPrompt.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: BuildPrompt ${buildPromptId} has no contractHash. ` +
          `Cannot generate ExecutionPlan without hash-locked BuildPrompt.`
      );
    }

    // Load approved ProjectRuleSet
    const projectRules = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId: buildPrompt.appRequestId },
    });

    if (!projectRules) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No ProjectRuleSet found for appRequestId ${buildPrompt.appRequestId}.`
      );
    }

    if (projectRules.status !== 'approved') {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: ProjectRuleSet is not approved (status: ${projectRules.status}).`
      );
    }

    if (!projectRules.rulesHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: ProjectRuleSet has no rulesHash. ` +
          `Cannot generate ExecutionPlan without hash-locked rules.`
      );
    }

    // Parse BuildPromptContract
    const contract = JSON.parse(buildPrompt.contractJson!);

    return {
      appRequestId: buildPrompt.appRequestId,
      buildPrompt: {
        id: buildPrompt.id,
        contractHash: buildPrompt.contractHash,
        scope: contract.scope,
        dependencies: contract.dependencies,
      },
      projectRules: {
        rulesHash: projectRules.rulesHash,
        techStack: this.extractTechStack(projectRules.content),
      },
    };
  }

  /**
   * TECH STACK EXTRACTION (Deterministic, keyword-based)
   */
  private extractTechStack(rulesContent: string): TechStack {
    const lower = rulesContent.toLowerCase();

    // Framework detection
    let framework = 'unknown';
    if (lower.includes('react') || lower.includes('next')) framework = 'React';
    else if (lower.includes('vue')) framework = 'Vue';
    else if (lower.includes('angular')) framework = 'Angular';
    else if (lower.includes('express') || lower.includes('fastify')) framework = 'Express';

    // Language detection
    let language = 'unknown';
    if (lower.includes('typescript')) language = 'TypeScript';
    else if (lower.includes('javascript')) language = 'JavaScript';
    else if (lower.includes('python')) language = 'Python';

    // Database detection
    let database: string | undefined;
    if (lower.includes('postgresql') || lower.includes('postgres')) database = 'PostgreSQL';
    else if (lower.includes('mysql')) database = 'MySQL';
    else if (lower.includes('sqlite')) database = 'SQLite';
    else if (lower.includes('mongodb')) database = 'MongoDB';

    return { framework, language, database };
  }

  /**
   * PHASE 2: CONTRACT GENERATION & VALIDATION
   */

  /**
   * DETERMINISTIC TASK GENERATION
   *
   * Rules:
   * 1. Dependencies ALWAYS first (task-0 if present)
   * 2. File creates BEFORE modifies
   * 3. Alphabetical order within each category
   * 4. NO OPTIMIZATION - preserve BuildPrompt order
   */
  private generateTasks(context: IsolatedContext): ExecutionTask[] {
    this.validateAction('generateExecutionPlan');

    const tasks: ExecutionTask[] = [];
    let taskIndex = 0;

    // Task 0: Dependencies (if any)
    if (context.buildPrompt.dependencies.add.length > 0) {
      tasks.push({
        taskId: `task-${taskIndex++}`,
        type: 'ADD_DEPENDENCY',
        target: 'package.json',
        description: `Install ${context.buildPrompt.dependencies.add.length} dependencies: ${context.buildPrompt.dependencies.add.join(', ')}`,
        dependsOn: [],
        verification: [
          'package.json must be valid JSON',
          'All dependencies must be listed in package.json',
          'No dependency version conflicts',
          'npm install or yarn install must succeed',
        ],
      });
    }

    // Tasks 1+: File creates (alphabetically sorted)
    const sortedCreates = [...context.buildPrompt.scope.filesToCreate].sort();
    for (const file of sortedCreates) {
      tasks.push({
        taskId: `task-${taskIndex++}`,
        type: 'CREATE_FILE',
        target: file,
        description: `Create file: ${file}`,
        dependsOn: [], // Creates have no dependencies
        verification: [
          `File ${file} must exist`,
          `File ${file} must compile without errors`,
          `File ${file} must not have TypeScript errors`,
          `File ${file} must not have linting errors`,
        ],
      });
    }

    // Tasks N+: File modifies (alphabetically sorted)
    const sortedModifies = [...context.buildPrompt.scope.filesToModify].sort();
    for (const file of sortedModifies) {
      tasks.push({
        taskId: `task-${taskIndex++}`,
        type: 'MODIFY_FILE',
        target: file,
        description: `Modify file: ${file}`,
        dependsOn: [], // Modifies have no dependencies in v1
        verification: [
          `File ${file} must exist`,
          `File ${file} must compile without errors`,
          `Modifications must preserve existing functionality`,
          `No new TypeScript errors introduced`,
        ],
      });
    }

    return tasks;
  }

  /**
   * CONTRACT VALIDATION (Comprehensive Checks)
   */
  private validateExecutionContract(contract: Omit<ExecutionPlanContract, 'contractHash'>): void {
    this.validateAction('validatePlanContract');

    // Check task IDs are sequential
    const expectedIds = contract.tasks.map((_, i) => `task-${i}`);
    const actualIds = contract.tasks.map((t) => t.taskId);

    if (!this.arraysEqual(expectedIds, actualIds)) {
      throw new Error(
        `VALIDATION FAILED: Task IDs are not sequential. ` +
          `Expected: ${expectedIds.join(', ')}. Got: ${actualIds.join(', ')}`
      );
    }

    // Check no task depends on itself
    for (const task of contract.tasks) {
      if (task.dependsOn.includes(task.taskId)) {
        throw new Error(`VALIDATION FAILED: Task ${task.taskId} depends on itself`);
      }
    }

    // Check all dependsOn references exist
    const taskIds = new Set(actualIds);
    for (const task of contract.tasks) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) {
          throw new Error(
            `VALIDATION FAILED: Task ${task.taskId} depends on non-existent task ${dep}`
          );
        }
      }
    }

    // Check dependency graph has no cycles
    const hasCycle = this.detectCycle(contract.tasks);
    if (hasCycle) {
      throw new Error(`VALIDATION FAILED: Task dependency graph has a cycle`);
    }

    // Check all tasks have verification criteria
    for (const task of contract.tasks) {
      if (task.verification.length === 0) {
        throw new Error(`VALIDATION FAILED: Task ${task.taskId} has no verification criteria`);
      }
    }

    // Check constraints are set correctly
    if (!contract.constraints.noParallelExecution) {
      throw new Error(`VALIDATION FAILED: noParallelExecution must be true`);
    }

    if (!contract.constraints.mustFollowSequence) {
      throw new Error(`VALIDATION FAILED: mustFollowSequence must be true`);
    }

    if (!contract.constraints.mustRespectFileOwnership) {
      throw new Error(`VALIDATION FAILED: mustRespectFileOwnership must be true`);
    }
  }

  /**
   * CYCLE DETECTION (Topological Sort Check)
   */
  private detectCycle(tasks: ExecutionTask[]): boolean {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Build adjacency list and in-degree map
    for (const task of tasks) {
      graph.set(task.taskId, task.dependsOn);
      inDegree.set(task.taskId, 0);
    }

    // Calculate in-degrees
    for (const task of tasks) {
      for (const dep of task.dependsOn) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }

    let processed = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      processed++;

      const dependencies = graph.get(current) || [];
      for (const dep of dependencies) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // If not all tasks were processed, there's a cycle
    return processed !== tasks.length;
  }

  /**
   * HASH COMPUTATION (Deterministic, excludes planId)
   */
  private computeContractHash(contract: Omit<ExecutionPlanContract, 'contractHash'>): string {
    // Stable serialization - EXCLUDE planId (it's a UUID)
    const serialized = JSON.stringify(
      contract,
      [
        'buildPromptHash', // Include this (deterministic)
        'sequenceNumber',
        'tasks',
        'taskId',
        'type',
        'target',
        'description',
        'dependsOn',
        'verification',
        'constraints',
        'noParallelExecution',
        'mustFollowSequence',
        'mustRespectFileOwnership',
      ].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * PHASE 3: HASH-LOCKING & PUBLIC API
   */

  /**
   * PUBLIC API: start(buildPromptId)
   *
   * Generates the first (and currently only) ExecutionPlan for a BuildPrompt
   */
  async start(buildPromptId: string): Promise<string> {
    this.logger.info({ buildPromptId }, 'Execution Planner Hardened: start()');

    // Get appRequestId from buildPrompt (needed for conductor operations)
    const buildPrompt = await this.prisma.buildPrompt.findUnique({
      where: { id: buildPromptId },
    });

    if (!buildPrompt) {
      throw new Error(`BuildPrompt not found: ${buildPromptId}`);
    }

    const appRequestId = buildPrompt.appRequestId;

    // Validate conductor state
    const snapshot = await this.conductor.getStateSnapshot(appRequestId);
    if (snapshot.currentStatus !== 'build_prompts_ready') {
      throw new Error(
        `CONDUCTOR STATE VIOLATION: Cannot start Execution Planner. ` +
          `Expected state 'build_prompts_ready', got '${snapshot.currentStatus}'.`
      );
    }

    // Lock conductor
    await this.conductor.lock(appRequestId);

    try {
      // Load isolated context
      const context = await this.loadIsolatedContext(buildPromptId);

      // Generate tasks
      const tasks = this.generateTasks(context);

      // Build contract (without hash)
      const planId = randomUUID();
      const contractWithoutHash: Omit<ExecutionPlanContract, 'contractHash'> = {
        planId,
        buildPromptHash: context.buildPrompt.contractHash,
        sequenceNumber: 0, // Currently 1:1 with BuildPrompt
        tasks,
        constraints: {
          noParallelExecution: true,
          mustFollowSequence: true,
          mustRespectFileOwnership: true,
        },
      };

      // Validate contract
      this.validateExecutionContract(contractWithoutHash);

      // Compute hash
      const contractHash = this.computeContractHash(contractWithoutHash);
      const contract: ExecutionPlanContract = { ...contractWithoutHash, contractHash };

      // Save to database
      const savedPlanId = await this.saveContract(buildPromptId, contract);

      // Emit event
      await this.emitEvent(
        context.appRequestId,
        'execution_plan_generated',
        `Execution plan generated: ${tasks.length} tasks (hash: ${contractHash.substring(0, 8)}...)`
      );

      // Pause for human approval
      await this.conductor.pauseForHuman(
        context.appRequestId,
        `Execution plan ready for review: ${tasks.length} tasks`
      );

      return savedPlanId;
    } finally {
      await this.conductor.unlock(appRequestId);
    }
  }

  /**
   * PUBLIC API: approve(planId, approver)
   */
  async approve(planId: string, approver: string): Promise<void> {
    this.logger.info({ planId, approver }, 'Approving execution plan');

    this.validateAction('pauseForApproval');

    // Find plan
    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`Execution plan not found: ${planId}`);
    }

    if (plan.status !== PlanStatus.AWAITING_APPROVAL) {
      throw new Error(
        `Execution plan ${planId} is not awaiting approval (status: ${plan.status})`
      );
    }

    // Update status
    await this.prisma.executionPlan.update({
      where: { id: planId },
      data: {
        status: PlanStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: approver,
      },
    });

    // Emit event
    await this.emitEvent(
      plan.appRequestId,
      'execution_plan_approved',
      `Execution plan approved by ${approver}`
    );

    // Resume conductor - transition to 'building' state
    await this.conductor.resumeAfterHuman(plan.appRequestId);
  }

  /**
   * PUBLIC API: reject(planId, reason)
   */
  async reject(planId: string, reason: string): Promise<void> {
    this.logger.info({ planId, reason }, 'Rejecting execution plan');

    this.validateAction('pauseForApproval');

    // Find plan
    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`Execution plan not found: ${planId}`);
    }

    // Update status
    await this.prisma.executionPlan.update({
      where: { id: planId },
      data: {
        status: PlanStatus.REJECTED,
      },
    });

    // Emit event
    await this.emitEvent(
      plan.appRequestId,
      'execution_plan_rejected',
      `Execution plan rejected: ${reason}`
    );

    // HALT - no auto-regeneration
    this.logger.warn({ planId, reason }, 'Execution plan rejected. Human intervention required.');
  }

  /**
   * SAVE CONTRACT TO DATABASE
   */
  private async saveContract(
    buildPromptId: string,
    contract: ExecutionPlanContract
  ): Promise<string> {
    const buildPrompt = await this.prisma.buildPrompt.findUnique({
      where: { id: buildPromptId },
    });

    if (!buildPrompt) {
      throw new Error(`BuildPrompt ${buildPromptId} not found`);
    }

    const saved = await this.prisma.executionPlan.create({
      data: {
        id: contract.planId,
        appRequestId: buildPrompt.appRequestId,
        buildPromptId,
        status: PlanStatus.AWAITING_APPROVAL,
        contractHash: contract.contractHash,
        contractJson: JSON.stringify(contract),
        buildPromptHash: buildPrompt.contractHash,
      },
    });

    return saved.id;
  }

  /**
   * EMIT AUDIT EVENT
   */
  private async emitEvent(
    appRequestId: string,
    eventType: string,
    message: string
  ): Promise<void> {
    this.validateAction('emitEvents');

    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: {
          id: randomUUID(),
          executionId: appRequest.executionId,
          type: eventType,
          message,
        },
      });
    }
  }

  /**
   * UTILITY: Array Equality Check
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
