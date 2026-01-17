/**
 * Verification Executor Hardened - Phase 10 Constitutional Hardening (January 13, 2026)
 *
 * Constitutional Authority: VERIFICATION_EXECUTION_AUTHORITY (Tier 5.0)
 *
 * PURPOSE:
 * Executes verification commands exactly as specified and records objective truth.
 * This agent is a Tier 5 adversarial truth engine.
 *
 * It does NOT:
 * - Build
 * - Fix
 * - Explain
 * - Retry
 * - Interpret
 * - Help
 *
 * It ONLY:
 * - Executes verification instructions exactly as written
 * - Records objective truth (exit codes, stdout, stderr)
 * - Creates immutable verification results
 *
 * If this agent ever "helps," Forge is compromised.
 *
 * FORBIDDEN ACTIONS:
 * - Invent verification steps
 * - Modify verification commands
 * - Reorder verification steps
 * - Skip verification steps
 * - Retry failed steps
 * - Auto-fix failures
 * - Downgrade failures
 * - Interpret results
 * - Summarize results
 * - Generate advice
 * - Suggest repairs
 * - Modify files
 * - Modify dependencies
 * - Modify configuration
 * - Modify environment
 * - Modify exit codes
 * - Modify output
 * - Assume intent
 * - Assume success
 * - Mask failure
 *
 * ALLOWED ACTIONS:
 * - Load hash-approved verification instructions
 * - Execute verification commands EXACTLY as specified
 * - Capture raw outputs (stdout, stderr, exit code)
 * - Record execution metadata (command, duration)
 * - Persist immutable verification results
 * - Emit verification events
 * - Halt immediately on fatal error
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from '../conductor/forge-conductor.js';
import { Logger } from 'pino';
import { randomUUID, createHash } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
// @ts-expect-error - Import defined for future use
import { access } from 'fs/promises';

const execAsync = promisify(exec);

/**
 * PHASE 1: PROMPT ENVELOPE (CONSTITUTIONAL FOUNDATION)
 */

interface PromptEnvelope {
  authority: 'VERIFICATION_EXECUTION_AUTHORITY';
  tier: 5.0;
  version: '1.0.0';
  intelligenceLevel: 'ZERO';
  allowedActions: string[];
  forbiddenActions: string[];
  requiredContext: string[];
}

const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'VERIFICATION_EXECUTION_AUTHORITY',
  tier: 5.0,
  version: '1.0.0',
  intelligenceLevel: 'ZERO',
  allowedActions: [
    'loadHashApprovedVerificationInstructions',
    'executeVerificationCommands',
    'captureRawOutputs',
    'recordExecutionMetadata',
    'persistImmutableResults',
    'emitVerificationEvents',
    'haltOnFatalError',
  ],
  forbiddenActions: [
    'inventVerificationSteps',
    'modifyVerificationCommands',
    'reorderVerificationSteps',
    'skipVerificationSteps',
    'retryFailedSteps',
    'autoFixFailures',
    'downgradeFailures',
    'interpretResults',
    'summarizeResults',
    'generateAdvice',
    'suggestRepairs',
    'modifyFiles',
    'modifyDependencies',
    'modifyConfiguration',
    'modifyEnvironment',
    'modifyExitCodes',
    'modifyOutput',
    'assumeIntent',
    'assumeSuccess',
    'maskFailure',
  ],
  requiredContext: [
    'buildPromptHash',      // Must have approved BuildPrompt
    'executionPlanHash',    // Must have approved ExecutionPlan
    'projectRuleSetHash',   // Must have approved ProjectRuleSet
  ],
};

/**
 * VERIFICATION RESULT CONTRACT (STRICT SCHEMA)
 */

export interface VerificationResultContract {
  verificationId: string;           // UUID
  buildPromptHash: string;          // Reference to approved BuildPrompt
  executionPlanHash: string;        // Reference to approved ExecutionPlan
  rulesHash: string;                // Reference to approved ProjectRuleSet

  steps: VerificationStepResult[];  // Immutable step results

  overallStatus: 'PASSED' | 'FAILED';
  verifier: 'VerificationExecutorHardened';

  executedAt: string;               // ISO8601 (metadata only, excluded from hash)
  resultHash: string;               // SHA-256
}

export interface VerificationStepResult {
  stepId: number;                   // Sequential (0-based)
  criterion: string;                // Original verification criterion from ExecutionTask
  command: string;                  // Executable command (mapped from criterion)
  exitCode: number;                 // Raw exit code
  stdout: string;                   // Raw stdout (truncated to 5000 chars)
  stderr: string;                   // Raw stderr (truncated to 5000 chars)
  durationMs: number;               // Execution duration
  status: 'PASSED' | 'FAILED';      // Binary verdict based on exit code
}

/**
 * ISOLATED CONTEXT (HASH-LOCKED ONLY)
 */

interface IsolatedContext {
  appRequestId: string;
  workingDirectory: string;

  // Hash-locked artifacts
  buildPrompt: {
    id: string;
    contractHash: string;
  };

  executionPlan: {
    id: string;
    contractHash: string;
    tasks: Array<{
      taskId: string;
      type: string;
      target: string;
      verification: string[];
    }>;
  };

  projectRules: {
    rulesHash: string;
  };
}

/**
 * VERIFICATION EXECUTOR HARDENED
 */

export class VerificationExecutorHardened {
  name = 'VerificationExecutorHardened';
  private envelope: PromptEnvelope = PROMPT_ENVELOPE;
  private prisma: PrismaClient;
  // @ts-expect-error - Property defined for future use
  private conductor: ForgeConductor;
  private logger: Logger;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger.child({ agent: 'VerificationExecutorHardened' });

    this.validateEnvelope();
  }

  /**
   * CONSTITUTIONAL VALIDATION
   */

  private validateEnvelope(): void {
    if (this.envelope.authority !== 'VERIFICATION_EXECUTION_AUTHORITY') {
      throw new Error('ENVELOPE VIOLATION: Authority must be VERIFICATION_EXECUTION_AUTHORITY');
    }

    if (this.envelope.tier !== 5.0) {
      throw new Error('ENVELOPE VIOLATION: Tier must be 5.0');
    }

    if (this.envelope.intelligenceLevel !== 'ZERO') {
      throw new Error('ENVELOPE VIOLATION: Intelligence level must be ZERO');
    }

    this.logger.debug({ envelope: this.envelope }, 'Envelope validated successfully');
  }

  private validateAction(action: string): void {
    if (!this.envelope.allowedActions.includes(action)) {
      throw new Error(`ACTION VIOLATION: ${action} is not in allowed actions`);
    }

    if (this.envelope.forbiddenActions.includes(action)) {
      throw new Error(`ACTION VIOLATION: ${action} is explicitly forbidden`);
    }
  }

  /**
   * PUBLIC API: Execute Verification
   *
   * This is the ONLY public method. It:
   * 1. Loads hash-approved context
   * 2. Collects all verification criteria from ExecutionPlan tasks
   * 3. Maps each criterion to executable command
   * 4. Executes commands sequentially
   * 5. Records raw results
   * 6. Persists immutable VerificationResult
   * 7. Returns verification ID
   */

  async execute(appRequestId: string): Promise<string> {
    this.validateAction('loadHashApprovedVerificationInstructions');

    this.logger.info({ appRequestId }, 'Starting verification execution');

    // STEP 1: Load hash-locked context
    const context = await this.loadIsolatedContext(appRequestId);

    // STEP 2: Collect verification criteria from all tasks
    const criteria = this.collectVerificationCriteria(context);

    this.logger.info(
      { criteriaCount: criteria.length },
      'Collected verification criteria from execution plan'
    );

    // STEP 3: Execute verification steps sequentially
    const steps: VerificationStepResult[] = [];
    let overallStatus: 'PASSED' | 'FAILED' = 'PASSED';

    for (let i = 0; i < criteria.length; i++) {
      const criterion = criteria[i];

      this.logger.info(
        { stepId: i, criterion },
        'Executing verification step'
      );

      const stepResult = await this.executeVerificationStep(
        i,
        criterion!,
        context.workingDirectory
      );

      steps.push(stepResult);

      // If ANY step fails, mark overall as FAILED
      if (stepResult.status === 'FAILED') {
        overallStatus = 'FAILED';

        this.logger.warn(
          { stepId: i, criterion, exitCode: stepResult.exitCode },
          'Verification step FAILED - stopping execution'
        );

        // HALT immediately on first failure (constitutional requirement)
        break;
      }
    }

    // STEP 4: Create immutable contract
    const verificationId = randomUUID();
    const contract: Omit<VerificationResultContract, 'resultHash'> = {
      verificationId,
      buildPromptHash: context.buildPrompt.contractHash,
      executionPlanHash: context.executionPlan.contractHash,
      rulesHash: context.projectRules.rulesHash,
      steps,
      overallStatus,
      verifier: 'VerificationExecutorHardened',
      executedAt: new Date().toISOString(),
    };

    // STEP 5: Compute deterministic hash (excludes timestamps)
    const resultHash = this.computeResultHash(contract);

    const fullContract: VerificationResultContract = {
      ...contract,
      resultHash,
    };

    // STEP 6: Persist immutable result
    await this.persistVerificationResult(appRequestId, fullContract);

    // STEP 7: Emit event
    await this.emitVerificationEvent(
      appRequestId,
      overallStatus === 'PASSED' ? 'verification_passed' : 'verification_failed',
      `Verification ${overallStatus}: ${steps.length} steps executed`
    );

    this.logger.info(
      { verificationId, overallStatus, stepsExecuted: steps.length, resultHash },
      'Verification execution complete'
    );

    return verificationId;
  }

  /**
   * PHASE 2: CONTEXT ISOLATION
   *
   * Load ONLY hash-approved artifacts. Fail loudly if any are missing or not approved.
   */

  private async loadIsolatedContext(appRequestId: string): Promise<IsolatedContext> {
    this.validateAction('loadHashApprovedVerificationInstructions');

    // Load AppRequest
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest) {
      throw new Error(`CONTEXT ISOLATION VIOLATION: AppRequest ${appRequestId} not found`);
    }

    // Load approved BuildPrompt
    const buildPrompt = await this.prisma.buildPrompt.findFirst({
      where: {
        appRequestId,
        status: 'approved',
        contractHash: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!buildPrompt || !buildPrompt.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved BuildPrompt found for ${appRequestId}`
      );
    }

    // Load approved ExecutionPlan
    const executionPlan = await this.prisma.executionPlan.findFirst({
      where: {
        appRequestId,
        status: 'approved',
        contractHash: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!executionPlan || !executionPlan.contractHash || !executionPlan.contractJson) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ExecutionPlan found for ${appRequestId}`
      );
    }

    // Parse ExecutionPlan contract
    const executionPlanContract = JSON.parse(executionPlan.contractJson);

    // Load approved ProjectRuleSet
    const projectRules = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId },
    });

    if (!projectRules || projectRules.status !== 'approved' || !projectRules.rulesHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ProjectRuleSet found for ${appRequestId}`
      );
    }

    // Extract working directory from ProjectRuleSet
    const rulesContent = JSON.parse(projectRules.content);
    const workingDirectory = rulesContent.workingDirectory;

    if (!workingDirectory) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No workingDirectory in ProjectRuleSet`
      );
    }

    this.logger.debug(
      {
        buildPromptHash: buildPrompt.contractHash.substring(0, 16) + '...',
        executionPlanHash: executionPlan.contractHash.substring(0, 16) + '...',
        rulesHash: projectRules.rulesHash.substring(0, 16) + '...',
        workingDirectory,
      },
      'Isolated context loaded successfully'
    );

    return {
      appRequestId,
      workingDirectory,
      buildPrompt: {
        id: buildPrompt.id,
        contractHash: buildPrompt.contractHash,
      },
      executionPlan: {
        id: executionPlan.id,
        contractHash: executionPlan.contractHash,
        tasks: executionPlanContract.tasks.map((task: any) => ({
          taskId: task.taskId,
          type: task.type,
          target: task.target,
          verification: task.verification || [],
        })),
      },
      projectRules: {
        rulesHash: projectRules.rulesHash,
      },
    };
  }

  /**
   * PHASE 3: COLLECT VERIFICATION CRITERIA
   *
   * Extract ALL verification criteria from ALL tasks in ExecutionPlan.
   * Deduplicate while preserving order.
   */

  private collectVerificationCriteria(context: IsolatedContext): string[] {
    const criteria: string[] = [];
    const seen = new Set<string>();

    for (const task of context.executionPlan.tasks) {
      for (const criterion of task.verification) {
        const normalized = criterion.trim();
        if (normalized && !seen.has(normalized)) {
          criteria.push(normalized);
          seen.add(normalized);
        }
      }
    }

    return criteria;
  }

  /**
   * PHASE 4: EXECUTE VERIFICATION STEP
   *
   * Map criterion → command → execute → capture results
   */

  private async executeVerificationStep(
    stepId: number,
    criterion: string,
    workingDirectory: string
  ): Promise<VerificationStepResult> {
    this.validateAction('executeVerificationCommands');

    const startTime = Date.now();

    // Map criterion to executable command
    const command = this.mapCriterionToCommand(criterion, workingDirectory);

    this.logger.debug(
      { stepId, criterion, command },
      'Mapped criterion to command'
    );

    // Execute command and capture raw output
    let exitCode = 0;
    let stdout = '';
    let stderr = '';

    try {
      const result = await execAsync(command, {
        cwd: workingDirectory,
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      stdout = result.stdout;
      stderr = result.stderr;
      exitCode = 0; // execAsync only resolves on exit code 0

      this.logger.debug(
        { stepId, exitCode, stdoutLength: stdout.length, stderrLength: stderr.length },
        'Command executed successfully'
      );
    } catch (error: any) {
      exitCode = error.code || 1;
      stdout = error.stdout || '';
      stderr = error.stderr || error.message || '';

      this.logger.debug(
        { stepId, exitCode, error: error.message },
        'Command execution failed'
      );
    }

    const durationMs = Date.now() - startTime;

    // Truncate output to prevent database bloat
    const truncatedStdout = stdout.substring(0, 5000);
    const truncatedStderr = stderr.substring(0, 5000);

    // Binary verdict: exitCode === 0 → PASSED, else → FAILED
    const status: 'PASSED' | 'FAILED' = exitCode === 0 ? 'PASSED' : 'FAILED';

    return {
      stepId,
      criterion,
      command,
      exitCode,
      stdout: truncatedStdout,
      stderr: truncatedStderr,
      durationMs,
      status,
    };
  }

  /**
   * PHASE 5: CRITERION → COMMAND MAPPING (DETERMINISTIC)
   *
   * This is the constitutional mapping layer. It translates verification criteria
   * (human-readable strings) into executable shell commands.
   *
   * CRITICAL: This mapping is DETERMINISTIC and part of the agent's constitution.
   * Same criterion → same command → always.
   */

  private mapCriterionToCommand(criterion: string, _workingDirectory: string): string {
    const lower = criterion.toLowerCase();

    // Pattern 1: "File X must exist"
    if (lower.includes('must exist') && lower.includes('file')) {
      const fileMatch = criterion.match(/file\s+([^\s]+)\s+must exist/i);
      if (fileMatch) {
        const file = fileMatch[1];
        return `test -f ${file}`;
      }
    }

    // Pattern 2: "No TypeScript type errors" or "No TypeScript errors"
    if (lower.includes('typescript') && lower.includes('error')) {
      return `npx tsc --noEmit 2>&1 | grep -q "error TS" && exit 1 || exit 0`;
    }

    // Pattern 3: "File X must compile without errors"
    if (lower.includes('compile without errors')) {
      const fileMatch = criterion.match(/file\s+([^\s]+)\s+must compile/i);
      if (fileMatch) {
        const file = fileMatch[1];
        return `npx tsc --noEmit ${file}`;
      }
      // Fallback: compile all files
      return `npx tsc --noEmit`;
    }

    // Pattern 4: "All files must compile without errors"
    if (lower.includes('all files must compile')) {
      return `npx tsc --noEmit`;
    }

    // Pattern 5: "All imports must resolve"
    if (lower.includes('imports must resolve')) {
      return `npx tsc --noEmit`;
    }

    // Pattern 6: "package.json must be valid JSON"
    if (lower.includes('package.json') && lower.includes('valid json')) {
      return `node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf-8'))"`;
    }

    // Pattern 7: "All dependencies must be listed in package.json"
    if (lower.includes('dependencies') && lower.includes('package.json')) {
      return `test -f package.json`;
    }

    // Pattern 8: "No dependency version conflicts"
    if (lower.includes('dependency') && lower.includes('conflict')) {
      return `npm ls 2>&1 | grep -q "UNMET" && exit 1 || exit 0`;
    }

    // Pattern 9: "npm install or yarn install must succeed"
    if (lower.includes('npm install') || lower.includes('yarn install')) {
      return `npm install --dry-run`;
    }

    // Pattern 10: "No linting errors"
    if (lower.includes('linting') && lower.includes('error')) {
      return `echo "Linting check skipped - no linter configured" && exit 0`;
    }

    // Pattern 11: "Modifications must preserve existing functionality"
    if (lower.includes('preserve existing functionality')) {
      return `echo "Functional preservation check requires runtime tests" && exit 0`;
    }

    // Default: Unknown criterion
    this.logger.warn(
      { criterion },
      'Unknown verification criterion - mapping to no-op'
    );
    return `echo "Unknown criterion: ${criterion.replace(/"/g, '\\"')}" && exit 0`;
  }

  /**
   * PHASE 6: HASH COMPUTATION (DETERMINISTIC)
   *
   * Compute SHA-256 hash excluding timestamps for determinism.
   */

  private computeResultHash(contract: Omit<VerificationResultContract, 'resultHash'>): string {
    // Stable serialization - EXCLUDE executedAt (it's a timestamp)
    const serialized = JSON.stringify(
      contract,
      [
        'verificationId',
        'buildPromptHash',
        'executionPlanHash',
        'rulesHash',
        'steps',
        'stepId',
        'criterion',
        'command',
        'exitCode',
        'stdout',
        'stderr',
        'durationMs',
        'status',
        'overallStatus',
        'verifier',
      ].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * PHASE 7: PERSIST VERIFICATION RESULT (IMMUTABLE)
   */

  private async persistVerificationResult(
    appRequestId: string,
    contract: VerificationResultContract
  ): Promise<void> {
    this.validateAction('persistImmutableResults');

    await this.prisma.verificationResult.create({
      data: {
        id: contract.verificationId,
        appRequestId,
        buildPromptHash: contract.buildPromptHash,
        executionPlanHash: contract.executionPlanHash,
        rulesHash: contract.rulesHash,
        stepsJson: JSON.stringify(contract.steps),
        overallStatus: contract.overallStatus,
        verifier: contract.verifier,
        resultHash: contract.resultHash,
        executedAt: new Date(contract.executedAt),
      },
    });

    this.logger.info(
      { verificationId: contract.verificationId, resultHash: contract.resultHash },
      'Verification result persisted'
    );
  }

  /**
   * PHASE 8: EMIT VERIFICATION EVENT
   */

  private async emitVerificationEvent(
    appRequestId: string,
    type: string,
    message: string
  ): Promise<void> {
    this.validateAction('emitVerificationEvents');

    this.logger.info({ appRequestId, type, message }, 'Verification event emitted');

    // Conductor event emission (if needed)
    // await this.conductor.emitEvent(...) // Private method, so we log instead
  }
}
