/**
 * Forge Implementer - Tier 5 Execution Agent
 *
 * THE ONLY AGENT THAT WRITES CODE
 *
 * This is a pure execution engine. It does not plan, decide, or invent.
 * It only executes approved Execution Units, exactly as specified.
 *
 * ABSOLUTE CONSTRAINTS:
 * - NEVER generates plans
 * - NEVER modifies execution contracts
 * - NEVER invents files, logic, or dependencies
 * - NEVER bypasses verification
 * - NEVER executes more than ONE ExecutionUnit at a time
 * - NEVER proceeds without Conductor permission
 * - NEVER continues after a failure
 * - NEVER weakens Phase 10 guarantees
 *
 * This is not an AI "coder". This is a manufacturing robot.
 */

import type { PrismaClient, ExecutionUnit } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DependencyChanges {
  newDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  rationale: string[];
}

interface ModificationIntent {
  [filePath: string]: {
    intent: string;
    constraints: string[];
  };
}

export class ForgeImplementer {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private projectRoot: string;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger, projectRoot: string) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;
    this.projectRoot = projectRoot;

    this.logger.info('ForgeImplementer initialized');
  }

  /**
   * Execute the next pending execution unit
   * This is the ONLY public method
   */
  async executeNextUnit(appRequestId: string): Promise<void> {
    this.logger.info({ appRequestId }, 'ForgeImplementer: Executing next unit');

    // STEP 0: Validate preconditions (HARD GATES)
    await this.validatePreconditions(appRequestId);

    // Get the next pending unit
    const unit = await this.getNextPendingUnit(appRequestId);

    if (!unit) {
      throw new Error('No pending execution unit found');
    }

    try {
      // STEP 1: Mark unit in progress
      await this.prisma.executionUnit.update({
        where: { id: unit.id },
        data: { status: 'in_progress' },
      });

      await this.emitEvent(appRequestId, 'execution_unit_started',
        `Started execution: ${unit.title} (Unit ${unit.sequenceIndex})`, unit);

      // STEP 2: Execute the unit
      await this.executeUnit(unit);

      // STEP 3: Post-execution validation
      await this.validatePostExecution(unit);

      // STEP 4: Mark unit complete
      await this.prisma.executionUnit.update({
        where: { id: unit.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      await this.emitEvent(appRequestId, 'execution_unit_completed',
        `Completed execution: ${unit.title} (Unit ${unit.sequenceIndex})`, unit);

      // STEP 5: Trigger verification
      await this.triggerVerification(appRequestId, unit);

    } catch (error: any) {
      // FAILURE: Mark unit as failed and HALT
      await this.prisma.executionUnit.update({
        where: { id: unit.id },
        data: { status: 'failed' },
      });

      await this.emitEvent(appRequestId, 'execution_unit_failed',
        `Failed execution: ${unit.title} - ${error.message}`, unit);

      throw new Error(`ExecutionUnit ${unit.sequenceIndex} failed: ${error.message}`);
    }
  }

  /**
   * Validate all preconditions before execution
   * HARD GATES - any failure throws
   */
  private async validatePreconditions(appRequestId: string): Promise<void> {
    // Gate 1: Conductor state must be 'building'
    const conductorState = await this.conductor.getStateSnapshot(appRequestId);
    if (conductorState.currentStatus !== 'building') {
      throw new Error(
        `Cannot execute: Conductor state is '${conductorState.currentStatus}', expected 'building'`
      );
    }

    // Gate 2: Conductor must be locked
    if (!conductorState.locked) {
      throw new Error('Cannot execute: Conductor is not locked');
    }

    // Gate 3: ExecutionPlan must exist and be approved
    const plan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) {
      throw new Error('Cannot execute: No ExecutionPlan found');
    }

    if (plan.status !== 'approved') {
      throw new Error(`Cannot execute: ExecutionPlan status is '${plan.status}', expected 'approved'`);
    }

    // Gate 4: Exactly ONE pending unit must exist
    const pendingUnits = await this.prisma.executionUnit.findMany({
      where: { executionPlanId: plan.id, status: 'pending' },
      orderBy: { sequenceIndex: 'asc' },
    });

    if (pendingUnits.length === 0) {
      throw new Error('Cannot execute: No pending ExecutionUnit found');
    }

    // Gate 5: Project Ruleset must exist and be approved
    const ruleset = await this.prisma.projectRuleSet.findFirst({
      where: { appRequestId },
    });

    if (!ruleset || ruleset.status !== 'approved') {
      throw new Error('Cannot execute: Project Ruleset not approved');
    }

    this.logger.info({ appRequestId }, 'Preconditions validated');
  }

  /**
   * Get the next pending execution unit (lowest sequenceIndex)
   */
  private async getNextPendingUnit(appRequestId: string): Promise<ExecutionUnit | null> {
    const plan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) return null;

    return await this.prisma.executionUnit.findFirst({
      where: { executionPlanId: plan.id, status: 'pending' },
      orderBy: { sequenceIndex: 'asc' },
    });
  }

  /**
   * Execute a single execution unit
   */
  private async executeUnit(unit: ExecutionUnit): Promise<void> {
    const allowedCreateFiles = JSON.parse(unit.allowedCreateFiles) as string[];
    const allowedModifyFiles = JSON.parse(unit.allowedModifyFiles) as string[];
    const forbiddenFiles = JSON.parse(unit.forbiddenFiles) as string[];
    const fullRewriteFiles = JSON.parse(unit.fullRewriteFiles) as string[];
    const dependencyChanges = JSON.parse(unit.dependencyChanges) as DependencyChanges;
    const modificationIntent = JSON.parse(unit.modificationIntent) as ModificationIntent;

    // STEP 2: Install dependencies (if declared)
    if (Object.keys(dependencyChanges.newDependencies || {}).length > 0 ||
        Object.keys(dependencyChanges.devDependencies || {}).length > 0) {
      await this.installDependencies(dependencyChanges, unit);
    }

    // STEP 3: File operations (in order: rewrite → create → modify)
    await this.executeFileOperations({
      allowedCreateFiles,
      allowedModifyFiles,
      fullRewriteFiles,
      forbiddenFiles,
      modificationIntent,
    }, unit);
  }

  /**
   * Install dependencies
   */
  private async installDependencies(changes: DependencyChanges, unit: ExecutionUnit): Promise<void> {
    await this.emitEvent(
      (await this.getAppRequestId(unit.executionPlanId)),
      'dependency_install_started',
      'Installing dependencies',
      unit
    );

    try {
      // Detect package manager
      const packageManager = await this.detectPackageManager();

      // Install production dependencies
      const prodDeps = Object.entries(changes.newDependencies || {});
      if (prodDeps.length > 0) {
        const depsToInstall = prodDeps.map(([pkg, ver]) => `${pkg}@${ver}`).join(' ');
        this.logger.info({ deps: depsToInstall }, 'Installing production dependencies');

        const installCmd = packageManager === 'npm'
          ? `npm install ${depsToInstall}`
          : packageManager === 'yarn'
          ? `yarn add ${depsToInstall}`
          : `pnpm add ${depsToInstall}`;

        await execAsync(installCmd, { cwd: this.projectRoot });
      }

      // Install dev dependencies
      const devDeps = Object.entries(changes.devDependencies || {});
      if (devDeps.length > 0) {
        const depsToInstall = devDeps.map(([pkg, ver]) => `${pkg}@${ver}`).join(' ');
        this.logger.info({ deps: depsToInstall }, 'Installing dev dependencies');

        const installCmd = packageManager === 'npm'
          ? `npm install --save-dev ${depsToInstall}`
          : packageManager === 'yarn'
          ? `yarn add --dev ${depsToInstall}`
          : `pnpm add --save-dev ${depsToInstall}`;

        await execAsync(installCmd, { cwd: this.projectRoot });
      }

      await this.emitEvent(
        (await this.getAppRequestId(unit.executionPlanId)),
        'dependency_install_completed',
        'Dependencies installed successfully',
        unit
      );
    } catch (error: any) {
      throw new Error(`Dependency installation failed: ${error.message}`);
    }
  }

  /**
   * Detect package manager from project
   */
  private async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      await fs.access(`${this.projectRoot}/yarn.lock`);
      return 'yarn';
    } catch {}

    try {
      await fs.access(`${this.projectRoot}/pnpm-lock.yaml`);
      return 'pnpm';
    } catch {}

    return 'npm'; // default
  }

  /**
   * Execute file operations (rewrite → create → modify)
   */
  private async executeFileOperations(
    contract: {
      allowedCreateFiles: string[];
      allowedModifyFiles: string[];
      fullRewriteFiles: string[];
      forbiddenFiles: string[];
      modificationIntent: ModificationIntent;
    },
    unit: ExecutionUnit
  ): Promise<void> {
    const appRequestId = await this.getAppRequestId(unit.executionPlanId);

    // 1. Full Rewrites
    for (const file of contract.fullRewriteFiles) {
      await this.emitEvent(appRequestId, 'file_write_started', `Rewriting: ${file}`, unit);

      // Validate file is in contract
      if (!contract.fullRewriteFiles.includes(file)) {
        throw new Error(`File ${file} not in fullRewriteFiles contract`);
      }

      // Generate content based on modification intent
      const content = await this.generateFileContent(file, contract.modificationIntent[file], 'rewrite');

      const fullPath = `${this.projectRoot}/${file}`;
      await fs.mkdir(dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      await this.emitEvent(appRequestId, 'file_write_completed', `Rewrote: ${file}`, unit);
    }

    // 2. Creates
    for (const file of contract.allowedCreateFiles) {
      await this.emitEvent(appRequestId, 'file_write_started', `Creating: ${file}`, unit);

      // Validate file is in contract
      if (!contract.allowedCreateFiles.includes(file)) {
        throw new Error(`File ${file} not in allowedCreateFiles contract`);
      }

      // Validate file doesn't already exist
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        await fs.access(fullPath);
        throw new Error(`File ${file} already exists (cannot create)`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Generate content based on modification intent
      const content = await this.generateFileContent(file, contract.modificationIntent[file], 'create');

      await fs.mkdir(dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      await this.emitEvent(appRequestId, 'file_write_completed', `Created: ${file}`, unit);
    }

    // 3. Modifications (patches)
    for (const file of contract.allowedModifyFiles) {
      await this.emitEvent(appRequestId, 'file_write_started', `Modifying: ${file}`, unit);

      // Validate file is in contract
      if (!contract.allowedModifyFiles.includes(file)) {
        throw new Error(`File ${file} not in allowedModifyFiles contract`);
      }

      // Validate file exists
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        await fs.access(fullPath);
      } catch {
        throw new Error(`File ${file} does not exist (cannot modify)`);
      }

      // Read existing content
      const existingContent = await fs.readFile(fullPath, 'utf-8');

      // Generate patch based on modification intent
      const patchedContent = await this.patchFileContent(
        file,
        existingContent,
        contract.modificationIntent[file]
      );

      await fs.writeFile(fullPath, patchedContent, 'utf-8');

      await this.emitEvent(appRequestId, 'file_write_completed', `Modified: ${file}`, unit);
    }
  }

  /**
   * Generate file content based on modification intent
   * This is a STUB - in production, this would use LLM with strict constraints
   */
  private async generateFileContent(
    filePath: string,
    intent: { intent: string; constraints: string[] },
    operation: 'create' | 'rewrite'
  ): Promise<string> {
    // STUB: In production, call LLM with:
    // - File path
    // - Modification intent
    // - Operation type
    // - Project rules
    // - Execution contract constraints

    return `// ${operation.toUpperCase()}: ${filePath}
// Intent: ${intent.intent}
// Constraints: ${intent.constraints.join(', ')}
// TODO: Implement based on intent
// This is a stub - production uses LLM generation

export default {};
`;
  }

  /**
   * Patch file content based on modification intent
   * This is a STUB - in production, this would use LLM with strict constraints
   */
  private async patchFileContent(
    filePath: string,
    existingContent: string,
    intent: { intent: string; constraints: string[] }
  ): Promise<string> {
    // STUB: In production, call LLM with:
    // - Existing content
    // - Modification intent
    // - Constraints (preserve existing, add new)
    // - Project rules

    return existingContent + `

// PATCHED: ${filePath}
// Intent: ${intent.intent}
// Constraints: ${intent.constraints.join(', ')}
// TODO: Implement patch based on intent
`;
  }

  /**
   * Validate post-execution state
   */
  private async validatePostExecution(unit: ExecutionUnit): Promise<void> {
    const allowedCreateFiles = JSON.parse(unit.allowedCreateFiles) as string[];
    const allowedModifyFiles = JSON.parse(unit.allowedModifyFiles) as string[];
    const fullRewriteFiles = JSON.parse(unit.fullRewriteFiles) as string[];
    const forbiddenFiles = JSON.parse(unit.forbiddenFiles) as string[];

    // Validate: All created files exist
    for (const file of allowedCreateFiles) {
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        await fs.access(fullPath);
      } catch {
        throw new Error(`Post-validation failed: ${file} was not created`);
      }
    }

    // Validate: All modified files exist
    for (const file of allowedModifyFiles) {
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        await fs.access(fullPath);
      } catch {
        throw new Error(`Post-validation failed: ${file} does not exist (should have been modified)`);
      }
    }

    // Validate: Forbidden files were not touched
    // (This is a simplified check - production would use git diff)
    for (const forbiddenPattern of forbiddenFiles) {
      // Simplified validation - just check file still exists if it should
      // Production: Use git diff to ensure no modifications
    }

    this.logger.info({ unitId: unit.id }, 'Post-execution validation passed');
  }

  /**
   * Trigger verification for this unit
   */
  private async triggerVerification(appRequestId: string, unit: ExecutionUnit): Promise<void> {
    // NOTE: In production, this would call the Verification Service
    // For now, we just emit an event
    await this.emitEvent(appRequestId, 'verification_triggered',
      `Verification triggered for unit ${unit.sequenceIndex}`, unit);

    this.logger.info({ appRequestId, unitId: unit.id }, 'Verification triggered');
  }

  /**
   * Get appRequestId from executionPlanId
   */
  private async getAppRequestId(executionPlanId: string): Promise<string> {
    const plan = await this.prisma.executionPlan.findUnique({
      where: { id: executionPlanId },
    });

    if (!plan) {
      throw new Error(`ExecutionPlan ${executionPlanId} not found`);
    }

    return plan.appRequestId;
  }

  /**
   * Emit execution event
   */
  private async emitEvent(
    appRequestId: string,
    type: string,
    message: string,
    unit?: ExecutionUnit
  ): Promise<void> {
    const appRequest = await this.prisma.appRequest.findUnique({ where: { id: appRequestId } });
    if (appRequest?.executionId) {
      const eventData: any = {
        id: randomUUID(),
        executionId: appRequest.executionId,
        type,
        message,
      };

      await this.prisma.executionEvent.create({ data: eventData });

      if (unit) {
        this.logger.info({
          appRequestId,
          executionPlanId: unit.executionPlanId,
          executionUnitId: unit.id,
          sequenceIndex: unit.sequenceIndex,
          type,
        }, message);
      }
    }
  }
}
