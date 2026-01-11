/**
 * Execution Planner - Tier 4 Execution Preparation Agent
 *
 * MICRO-EXECUTION DECOMPOSER
 *
 * Responsibilities:
 * - Takes one approved Build Prompt
 * - Deterministically decomposes it into ordered, minimal execution units
 * - Each unit is independently executable and verifiable
 * - Preserves original Build Prompt intent EXACTLY
 * - NO code generation, NO file modification, NO dependency installation
 *
 * HARD CONSTRAINTS:
 * - Cannot start unless Conductor = build_prompts_ready
 * - Does NOT write code or execute changes
 * - Does NOT mutate intent or add features
 * - Only decomposes existing approved intent
 * - Human approval required for execution plan
 * - Lock/unlock discipline required
 * - Full event emission for observability
 */

import type { PrismaClient, ExecutionPlan, ExecutionUnit } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';

const ExecutionPlanStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

const ExecutionUnitStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

type ExecutionPlanStatusValue = (typeof ExecutionPlanStatus)[keyof typeof ExecutionPlanStatus];
type ExecutionUnitStatusValue = (typeof ExecutionUnitStatus)[keyof typeof ExecutionUnitStatus];

export interface ExecutionPlanData {
  id: string;
  appRequestId: string;
  buildPromptId: string;
  status: ExecutionPlanStatusValue;
  units: ExecutionUnitData[];
  createdAt: Date;
  approvedAt: Date | null;
}

export interface ExecutionUnitData {
  id: string;
  executionPlanId: string;
  sequenceIndex: number;
  title: string;
  description: string;
  allowedCreateFiles: string[];
  allowedModifyFiles: string[];
  forbiddenFiles: string[];
  fullRewriteFiles: string[];
  dependencyChanges: DependencyChanges;
  modificationIntent: Record<string, { intent: string; constraints: string[] }>;
  status: ExecutionUnitStatusValue;
  createdAt: Date;
  completedAt: Date | null;
}

export interface DependencyChanges {
  newDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  rationale: string[];
}

export interface ExecutionPlanSummary {
  totalUnits: number;
  completedUnits: number;
  currentUnit: ExecutionUnitData | null;
  remainingUnits: number;
}

/**
 * Decomposition decision criteria
 */
interface DecompositionCriteria {
  hasMultipleDependencies: boolean;
  hasMixedOperations: boolean;
  hasFullRewrite: boolean;
  fileModificationCount: number;
  touchesFrontendAndBackend: boolean;
  isHighRisk: boolean;
}

export class ExecutionPlanner {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;

    this.logger.info('ExecutionPlanner initialized');
  }

  /**
   * Start execution planning for a build prompt
   * Decomposes the prompt into execution units if needed
   */
  async start(buildPromptId: string): Promise<ExecutionPlanData> {
    this.logger.info({ buildPromptId }, 'Starting Execution Planner');

    // Get build prompt
    const buildPrompt = await this.prisma.buildPrompt.findUnique({
      where: { id: buildPromptId },
    });

    if (!buildPrompt) {
      throw new Error(`BuildPrompt ${buildPromptId} not found`);
    }

    // Verify Conductor state
    const state = await this.conductor.getStateSnapshot(buildPrompt.appRequestId);
    if (state.currentStatus !== 'build_prompts_ready') {
      throw new Error(
        `Cannot start Execution Planner: Conductor state is '${state.currentStatus}', expected 'build_prompts_ready'`
      );
    }

    await this.conductor.lock(buildPrompt.appRequestId);

    try {
      // Analyze build prompt to determine if decomposition is needed
      const criteria = this.analyzeDecompositionNeed(buildPrompt);
      const needsDecomposition = this.shouldDecompose(criteria);

      // Generate execution units
      const units = needsDecomposition
        ? await this.decomposeIntoMultipleUnits(buildPrompt, criteria)
        : await this.createSingleUnit(buildPrompt);

      // Create execution plan
      const plan = await this.prisma.executionPlan.create({
        data: {
          id: randomUUID(),
          appRequestId: buildPrompt.appRequestId,
          buildPromptId: buildPrompt.id,
          status: ExecutionPlanStatus.PENDING,
        },
      });

      // Create all execution units
      for (const unit of units) {
        await this.prisma.executionUnit.create({
          data: {
            id: randomUUID(),
            executionPlanId: plan.id,
            sequenceIndex: unit.sequenceIndex,
            title: unit.title,
            description: unit.description,
            allowedCreateFiles: JSON.stringify(unit.allowedCreateFiles),
            allowedModifyFiles: JSON.stringify(unit.allowedModifyFiles),
            forbiddenFiles: JSON.stringify(unit.forbiddenFiles),
            fullRewriteFiles: JSON.stringify(unit.fullRewriteFiles),
            dependencyChanges: JSON.stringify(unit.dependencyChanges),
            modificationIntent: JSON.stringify(unit.modificationIntent),
            status: ExecutionUnitStatus.PENDING,
          },
        });
      }

      await this.emitEvent(buildPrompt.appRequestId, 'execution_plan_created',
        `Execution plan created with ${units.length} unit(s)`);

      await this.conductor.pauseForHuman(buildPrompt.appRequestId,
        `Execution plan generated - ${units.length} unit(s) - awaiting approval`);

      await this.conductor.unlock(buildPrompt.appRequestId);

      return this.toPlanData(plan.id);
    } catch (error) {
      await this.conductor.unlock(buildPrompt.appRequestId);
      throw error;
    }
  }

  /**
   * Approve the execution plan
   */
  async approvePlan(planId: string): Promise<void> {
    this.logger.info({ planId }, 'Approving execution plan');

    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`ExecutionPlan ${planId} not found`);
    }

    await this.prisma.executionPlan.update({
      where: { id: planId },
      data: { status: ExecutionPlanStatus.APPROVED, approvedAt: new Date() },
    });

    await this.emitEvent(plan.appRequestId, 'execution_plan_approved',
      'Execution plan approved - ready for execution');

    await this.conductor.resumeAfterHuman(plan.appRequestId);
  }

  /**
   * Reject the execution plan
   */
  async rejectPlan(planId: string, reason: string): Promise<void> {
    this.logger.info({ planId, reason }, 'Rejecting execution plan');

    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error(`ExecutionPlan ${planId} not found`);
    }

    await this.prisma.executionPlan.update({
      where: { id: planId },
      data: { status: ExecutionPlanStatus.REJECTED },
    });

    await this.emitEvent(plan.appRequestId, 'execution_plan_rejected',
      `Execution plan rejected: ${reason}`);
  }

  /**
   * Get current execution unit
   */
  async getCurrentUnit(appRequestId: string): Promise<ExecutionUnitData | null> {
    const plan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId, status: ExecutionPlanStatus.APPROVED },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) return null;

    const unit = await this.prisma.executionUnit.findFirst({
      where: { executionPlanId: plan.id, status: ExecutionUnitStatus.PENDING },
      orderBy: { sequenceIndex: 'asc' },
    });

    return unit ? this.toUnitData(unit) : null;
  }

  /**
   * Mark current unit as completed
   */
  async completeCurrentUnit(unitId: string): Promise<void> {
    await this.prisma.executionUnit.update({
      where: { id: unitId },
      data: { status: ExecutionUnitStatus.COMPLETED, completedAt: new Date() },
    });

    const unit = await this.prisma.executionUnit.findUnique({ where: { id: unitId } });
    if (unit) {
      const plan = await this.prisma.executionPlan.findUnique({ where: { id: unit.executionPlanId } });
      if (plan) {
        await this.emitEvent(plan.appRequestId, 'execution_unit_completed',
          `Unit ${unit.sequenceIndex + 1} completed: ${unit.title}`);
      }
    }
  }

  /**
   * Get execution plan status summary
   */
  async getPlanStatus(appRequestId: string): Promise<ExecutionPlanSummary> {
    const plan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
      include: { units: true },
    });

    if (!plan) {
      return { totalUnits: 0, completedUnits: 0, currentUnit: null, remainingUnits: 0 };
    }

    const totalUnits = plan.units.length;
    const completedUnits = plan.units.filter(u => u.status === ExecutionUnitStatus.COMPLETED).length;
    const currentUnit = await this.getCurrentUnit(appRequestId);
    const remainingUnits = totalUnits - completedUnits;

    return { totalUnits, completedUnits, currentUnit, remainingUnits };
  }

  /**
   * Analyze whether decomposition is needed
   */
  private analyzeDecompositionNeed(buildPrompt: any): DecompositionCriteria {
    const allowedCreateFiles = JSON.parse(buildPrompt.allowedCreateFiles);
    const allowedModifyFiles = JSON.parse(buildPrompt.allowedModifyFiles);
    const fullRewriteFiles = JSON.parse(buildPrompt.fullRewriteFiles);
    const dependencyManifest = JSON.parse(buildPrompt.dependencyManifest);

    const totalFiles = allowedCreateFiles.length + allowedModifyFiles.length + fullRewriteFiles.length;
    const newDeps = Object.keys(dependencyManifest.newDependencies || {});
    const devDeps = Object.keys(dependencyManifest.devDependencies || {});

    return {
      hasMultipleDependencies: (newDeps.length + devDeps.length) > 0,
      hasMixedOperations: allowedCreateFiles.length > 0 &&
                          (allowedModifyFiles.length > 0 || fullRewriteFiles.length > 0),
      hasFullRewrite: fullRewriteFiles.length > 0,
      fileModificationCount: totalFiles,
      touchesFrontendAndBackend: this.detectFrontendAndBackend(allowedCreateFiles, allowedModifyFiles),
      isHighRisk: this.detectHighRisk(buildPrompt),
    };
  }

  /**
   * Determine if decomposition is needed based on criteria
   */
  private shouldDecompose(criteria: DecompositionCriteria): boolean {
    // Decompose if ANY of these conditions are true:
    return (
      criteria.fileModificationCount > 5 ||
      (criteria.hasMultipleDependencies && criteria.fileModificationCount > 0) ||
      criteria.hasMixedOperations ||
      criteria.touchesFrontendAndBackend ||
      criteria.isHighRisk
    );
  }

  /**
   * Detect if prompt touches both frontend and backend
   */
  private detectFrontendAndBackend(createFiles: string[], modifyFiles: string[]): boolean {
    const allFiles = [...createFiles, ...modifyFiles];
    const hasFrontend = allFiles.some(f =>
      f.includes('components/') || f.includes('.tsx') || f.includes('.jsx') || f.includes('ui/')
    );
    const hasBackend = allFiles.some(f =>
      f.includes('api/') || f.includes('server/') || f.includes('services/') || f.includes('db/')
    );
    return hasFrontend && hasBackend;
  }

  /**
   * Detect high-risk operations (auth, routing, providers)
   */
  private detectHighRisk(buildPrompt: any): boolean {
    const content = buildPrompt.content.toLowerCase();
    const riskKeywords = ['auth', 'authentication', 'provider', 'routing', 'middleware', 'session'];
    return riskKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Decompose build prompt into multiple execution units
   */
  private async decomposeIntoMultipleUnits(buildPrompt: any, criteria: DecompositionCriteria): Promise<any[]> {
    const units: any[] = [];
    let sequenceIndex = 0;

    const allowedCreateFiles = JSON.parse(buildPrompt.allowedCreateFiles);
    const allowedModifyFiles = JSON.parse(buildPrompt.allowedModifyFiles);
    const fullRewriteFiles = JSON.parse(buildPrompt.fullRewriteFiles);
    const dependencyManifest = JSON.parse(buildPrompt.dependencyManifest);
    const modificationIntent = JSON.parse(buildPrompt.modificationIntent);
    const forbiddenFiles = JSON.parse(buildPrompt.forbiddenFiles);

    // Unit 1: Install dependencies (if any)
    if (criteria.hasMultipleDependencies) {
      units.push({
        sequenceIndex: sequenceIndex++,
        title: 'Install Dependencies',
        description: 'Install required dependencies for this build phase',
        allowedCreateFiles: [],
        allowedModifyFiles: [],
        forbiddenFiles,
        fullRewriteFiles: [],
        dependencyChanges: dependencyManifest,
        modificationIntent: {},
      });
    }

    // Unit 2+: File operations (grouped logically)
    if (allowedCreateFiles.length > 0) {
      const createBatches = this.batchFiles(allowedCreateFiles, 3);
      for (const batch of createBatches) {
        const intent: Record<string, any> = {};
        batch.forEach(file => {
          if (modificationIntent[file]) {
            intent[file] = modificationIntent[file];
          }
        });

        units.push({
          sequenceIndex: sequenceIndex++,
          title: `Create Files (${batch.length})`,
          description: `Create: ${batch.join(', ')}`,
          allowedCreateFiles: batch,
          allowedModifyFiles: [],
          forbiddenFiles,
          fullRewriteFiles: [],
          dependencyChanges: { newDependencies: {}, devDependencies: {}, rationale: [] },
          modificationIntent: intent,
        });
      }
    }

    if (allowedModifyFiles.length > 0) {
      const modifyBatches = this.batchFiles(allowedModifyFiles, 3);
      for (const batch of modifyBatches) {
        const intent: Record<string, any> = {};
        batch.forEach(file => {
          if (modificationIntent[file]) {
            intent[file] = modificationIntent[file];
          }
        });

        units.push({
          sequenceIndex: sequenceIndex++,
          title: `Modify Files (${batch.length})`,
          description: `Patch: ${batch.join(', ')}`,
          allowedCreateFiles: [],
          allowedModifyFiles: batch,
          forbiddenFiles,
          fullRewriteFiles: [],
          dependencyChanges: { newDependencies: {}, devDependencies: {}, rationale: [] },
          modificationIntent: intent,
        });
      }
    }

    if (fullRewriteFiles.length > 0) {
      for (const file of fullRewriteFiles) {
        const intent: Record<string, any> = {};
        if (modificationIntent[file]) {
          intent[file] = modificationIntent[file];
        }

        units.push({
          sequenceIndex: sequenceIndex++,
          title: `Rewrite File`,
          description: `Full rewrite: ${file}`,
          allowedCreateFiles: [],
          allowedModifyFiles: [],
          forbiddenFiles,
          fullRewriteFiles: [file],
          dependencyChanges: { newDependencies: {}, devDependencies: {}, rationale: [] },
          modificationIntent: intent,
        });
      }
    }

    return units;
  }

  /**
   * Create single execution unit (no decomposition needed)
   */
  private async createSingleUnit(buildPrompt: any): Promise<any[]> {
    return [{
      sequenceIndex: 0,
      title: buildPrompt.title,
      description: 'Execute complete build prompt',
      allowedCreateFiles: JSON.parse(buildPrompt.allowedCreateFiles),
      allowedModifyFiles: JSON.parse(buildPrompt.allowedModifyFiles),
      forbiddenFiles: JSON.parse(buildPrompt.forbiddenFiles),
      fullRewriteFiles: JSON.parse(buildPrompt.fullRewriteFiles),
      dependencyChanges: JSON.parse(buildPrompt.dependencyManifest),
      modificationIntent: JSON.parse(buildPrompt.modificationIntent),
    }];
  }

  /**
   * Batch files into groups
   */
  private batchFiles(files: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Emit execution event
   */
  private async emitEvent(appRequestId: string, type: string, message: string): Promise<void> {
    const appRequest = await this.prisma.appRequest.findUnique({ where: { id: appRequestId } });
    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: { id: randomUUID(), executionId: appRequest.executionId, type, message },
      });
    }
  }

  /**
   * Convert database ExecutionPlan to ExecutionPlanData
   */
  private async toPlanData(planId: string): Promise<ExecutionPlanData> {
    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: planId },
      include: { units: { orderBy: { sequenceIndex: 'asc' } } },
    });

    if (!plan) {
      throw new Error(`ExecutionPlan ${planId} not found`);
    }

    return {
      id: plan.id,
      appRequestId: plan.appRequestId,
      buildPromptId: plan.buildPromptId,
      status: plan.status as ExecutionPlanStatusValue,
      units: plan.units.map(u => this.toUnitData(u)),
      createdAt: plan.createdAt,
      approvedAt: plan.approvedAt,
    };
  }

  /**
   * Convert database ExecutionUnit to ExecutionUnitData
   */
  private toUnitData(unit: ExecutionUnit): ExecutionUnitData {
    return {
      id: unit.id,
      executionPlanId: unit.executionPlanId,
      sequenceIndex: unit.sequenceIndex,
      title: unit.title,
      description: unit.description,
      allowedCreateFiles: JSON.parse(unit.allowedCreateFiles),
      allowedModifyFiles: JSON.parse(unit.allowedModifyFiles),
      forbiddenFiles: JSON.parse(unit.forbiddenFiles),
      fullRewriteFiles: JSON.parse(unit.fullRewriteFiles),
      dependencyChanges: JSON.parse(unit.dependencyChanges),
      modificationIntent: JSON.parse(unit.modificationIntent),
      status: unit.status as ExecutionUnitStatusValue,
      createdAt: unit.createdAt,
      completedAt: unit.completedAt,
    };
  }
}
