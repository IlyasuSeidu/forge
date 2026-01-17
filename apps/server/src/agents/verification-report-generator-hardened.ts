/**
 * Verification Report Generator Hardened - Tier 5.5 Constitutional Implementation (January 13, 2026)
 *
 * Constitutional Authority: VERIFICATION_REPORT_AUTHORITY
 *
 * PURPOSE:
 * Mechanically transforms immutable verification evidence into human-readable reports.
 * This agent is a PURE PROJECTION engine with ZERO intelligence and ZERO judgment.
 *
 * It does NOT:
 * - Verify
 * - Judge completion
 * - Influence execution
 * - Interpret results
 * - Soften failures
 * - Add recommendations
 * - Alter meaning
 * - Reorder facts
 *
 * It ONLY:
 * - Reads VerificationResult (hash-locked evidence)
 * - Projects data verbatim into report format
 * - Computes deterministic hash
 * - Persists immutable report
 *
 * CRITICAL: If this agent ever "helps," Forge is lying.
 *
 * CONSTITUTIONAL POSITION:
 * Executes AFTER: Verification Executor Hardened
 * BEFORE: Completion Auditor Hardened (optional - auditor doesn't depend on it)
 * FEEDS: Humans (not machines)
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from '../conductor/forge-conductor.js';
import { Logger } from 'pino';
import { randomUUID, createHash } from 'crypto';

/**
 * PHASE 1: PROMPT ENVELOPE (CONSTITUTIONAL FOUNDATION)
 */

interface PromptEnvelope {
  authority: 'VERIFICATION_REPORT_AUTHORITY';
  tier: 5.5;
  version: '1.0.0';
  intelligenceLevel: 'ZERO';
  judgmentLevel: 'ZERO';
  verdictPower: 'NONE';
  allowedActions: string[];
  forbiddenActions: string[];
  requiredContext: string[];
}

const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'VERIFICATION_REPORT_AUTHORITY',
  tier: 5.5,
  version: '1.0.0',
  intelligenceLevel: 'ZERO',
  judgmentLevel: 'ZERO',
  verdictPower: 'NONE',
  allowedActions: [
    'loadHashApprovedVerificationResult',
    'projectDataVerbatim',
    'serializeDeterministically',
    'computeSHA256Hash',
    'persistImmutableReport',
    'emitAuditEvent',
  ],
  forbiddenActions: [
    'reRunVerification',
    'modifyVerificationOutput',
    'interpretResults',
    'suggestFixes',
    'maskFailures',
    'softenFailures',
    'generateSummaries',
    'triggerCompletionAuditor',
    'triggerRepairAgent',
    'modifyConductorState',
    'retryAnything',
    'inventContext',
    'declarePASS',
    'declareFAIL',
    'blockCompletion',
    'allowCompletion',
    'modifyArtifacts',
  ],
  requiredContext: [
    'verificationResultHash',  // Must have approved VerificationResult
  ],
};

/**
 * VERIFICATION REPORT CONTRACT (STRICT SCHEMA)
 */

export interface VerificationReportContract {
  reportId: string;                     // UUID
  appRequestId: string;
  verificationResultId: string;         // Reference to VerificationResult

  // Report Metadata
  generatedAt: string;                  // ISO8601 (excluded from hash)
  generator: 'VerificationReportGeneratorHardened';

  // Hash References (audit trail)
  verificationResultHash: string;
  buildPromptHash: string;
  executionPlanHash: string;
  rulesHash: string;

  // Verification Summary (Non-Interpretive)
  summary: {
    totalSteps: number;
    stepsPassed: number;
    stepsFailed: number;
    overallStatus: 'PASSED' | 'FAILED';  // COPY FROM VerificationResult ONLY
  };

  // Step-by-Step Results (Mechanical Projection)
  steps: VerificationReportStep[];

  // Failure Section (ONLY IF FAILURES EXIST)
  failures: VerificationReportFailure[] | null;

  // Immutability Footer
  footer: string;                       // Constitutional disclaimer

  // Hash (SHA-256)
  reportHash: string;
}

export interface VerificationReportStep {
  stepIndex: number;
  description: string;                  // Verbatim from verification criteria
  commandExecuted: string;
  exitCode: number;
  stdout: string;                       // Truncated to 5KB
  stderr: string;                       // Truncated to 5KB
  status: 'PASSED' | 'FAILED';
}

export interface VerificationReportFailure {
  stepIndex: number;
  exitCode: number;
  stderrExcerpt: string;                // Truncated to 1KB
}

/**
 * VERIFICATION REPORT GENERATOR HARDENED
 */

export class VerificationReportGeneratorHardened {
  name = 'VerificationReportGeneratorHardened';
  private envelope: PromptEnvelope = PROMPT_ENVELOPE;
  private prisma: PrismaClient;
  // @ts-expect-error - Property defined for future use
  private conductor: ForgeConductor;
  private logger: Logger;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger.child({ agent: 'VerificationReportGeneratorHardened' });

    this.validateEnvelope();
  }

  /**
   * CONSTITUTIONAL VALIDATION
   */

  private validateEnvelope(): void {
    if (this.envelope.authority !== 'VERIFICATION_REPORT_AUTHORITY') {
      throw new Error('ENVELOPE VIOLATION: Authority must be VERIFICATION_REPORT_AUTHORITY');
    }

    if (this.envelope.tier !== 5.5) {
      throw new Error('ENVELOPE VIOLATION: Tier must be 5.5');
    }

    if (this.envelope.intelligenceLevel !== 'ZERO') {
      throw new Error('ENVELOPE VIOLATION: Intelligence level must be ZERO');
    }

    if (this.envelope.judgmentLevel !== 'ZERO') {
      throw new Error('ENVELOPE VIOLATION: Judgment level must be ZERO');
    }

    if (this.envelope.verdictPower !== 'NONE') {
      throw new Error('ENVELOPE VIOLATION: Verdict power must be NONE');
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
   * PUBLIC API: Generate Report
   *
   * This is the ONLY public method. It:
   * 1. Loads hash-approved VerificationResult
   * 2. Projects data verbatim into report format
   * 3. Computes deterministic hash
   * 4. Persists immutable report
   * 5. Returns report ID
   */

  async generate(appRequestId: string): Promise<string> {
    this.validateAction('loadHashApprovedVerificationResult');

    this.logger.info({ appRequestId }, 'Starting report generation');

    // STEP 1: Load VerificationResult (hash-locked evidence)
    const verificationResult = await this.loadVerificationResult(appRequestId);

    // STEP 2: Project data verbatim into report format
    const reportContract = this.projectDataVerbatim(verificationResult);

    // STEP 3: Compute deterministic hash
    const reportHash = this.computeReportHash(reportContract);

    const fullContract: VerificationReportContract = {
      ...reportContract,
      reportHash,
    };

    // STEP 4: Persist immutable report
    await this.persistImmutableReport(appRequestId, fullContract);

    // STEP 5: Emit audit event
    await this.emitAuditEvent(appRequestId, 'verification_report_generated', reportHash);

    this.logger.info(
      { reportId: fullContract.reportId, reportHash },
      'Report generation complete'
    );

    return fullContract.reportId;
  }

  /**
   * PHASE 2: LOAD VERIFICATION RESULT (HASH-LOCKED ONLY)
   */

  private async loadVerificationResult(appRequestId: string): Promise<any> {
    this.validateAction('loadHashApprovedVerificationResult');

    // Load most recent VerificationResult
    const verificationResult = await this.prisma.verificationResult.findFirst({
      where: { appRequestId },
      orderBy: { executedAt: 'desc' },
    });

    if (!verificationResult) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No VerificationResult found for ${appRequestId}`
      );
    }

    // Verify hash-locking
    if (!verificationResult.resultHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: VerificationResult ${verificationResult.id} missing resultHash`
      );
    }

    this.logger.debug(
      {
        verificationResultId: verificationResult.id,
        resultHash: verificationResult.resultHash.substring(0, 16) + '...',
        overallStatus: verificationResult.overallStatus,
      },
      'Verification result loaded successfully'
    );

    return verificationResult;
  }

  /**
   * PHASE 3: PROJECT DATA VERBATIM (ZERO INTERPRETATION)
   */

  private projectDataVerbatim(verificationResult: any): Omit<VerificationReportContract, 'reportHash'> {
    this.validateAction('projectDataVerbatim');

    // Parse verification steps
    const verificationSteps = JSON.parse(verificationResult.stepsJson);

    // Count passed/failed steps
    const stepsPassed = verificationSteps.filter((s: any) => s.status === 'PASSED').length;
    const stepsFailed = verificationSteps.filter((s: any) => s.status === 'FAILED').length;

    // Project steps verbatim (NO interpretation, NO summarization)
    const steps: VerificationReportStep[] = verificationSteps.map((step: any) => ({
      stepIndex: step.stepId,
      description: step.criterion,           // Verbatim
      commandExecuted: step.command,         // Verbatim
      exitCode: step.exitCode,               // Raw
      stdout: step.stdout.substring(0, 5120),  // Truncate to 5KB
      stderr: step.stderr.substring(0, 5120),  // Truncate to 5KB
      status: step.status,                   // Verbatim (PASSED | FAILED)
    }));

    // Extract failures (ONLY IF FAILURES EXIST)
    const failures: VerificationReportFailure[] | null =
      stepsFailed > 0
        ? verificationSteps
            .filter((s: any) => s.status === 'FAILED')
            .map((step: any) => ({
              stepIndex: step.stepId,
              exitCode: step.exitCode,
              stderrExcerpt: step.stderr.substring(0, 1024),  // 1KB excerpt
            }))
        : null;

    // Immutability footer (exact constitutional text)
    const footer =
      'This report is a mechanical projection of immutable verification results. ' +
      'It contains no interpretation, judgment, or recommendation. ' +
      'Any deviation from recorded verification output constitutes a system violation.';

    const reportId = randomUUID();

    return {
      reportId,
      appRequestId: verificationResult.appRequestId,
      verificationResultId: verificationResult.id,
      generatedAt: new Date().toISOString(),
      generator: 'VerificationReportGeneratorHardened',
      verificationResultHash: verificationResult.resultHash,
      buildPromptHash: verificationResult.buildPromptHash,
      executionPlanHash: verificationResult.executionPlanHash,
      rulesHash: verificationResult.rulesHash,
      summary: {
        totalSteps: verificationSteps.length,
        stepsPassed,
        stepsFailed,
        overallStatus: verificationResult.overallStatus,  // COPY ONLY (NO interpretation)
      },
      steps,
      failures,
      footer,
    };
  }

  /**
   * PHASE 4: COMPUTE DETERMINISTIC HASH (EXCLUDE TIMESTAMPS)
   */

  private computeReportHash(contract: Omit<VerificationReportContract, 'reportHash'>): string {
    this.validateAction('computeSHA256Hash');

    // Stable serialization - EXCLUDE generatedAt (it's a timestamp)
    const serialized = JSON.stringify(
      contract,
      [
        'reportId',
        'appRequestId',
        'verificationResultId',
        'generator',
        'verificationResultHash',
        'buildPromptHash',
        'executionPlanHash',
        'rulesHash',
        'summary',
        'totalSteps',
        'stepsPassed',
        'stepsFailed',
        'overallStatus',
        'steps',
        'stepIndex',
        'description',
        'commandExecuted',
        'exitCode',
        'stdout',
        'stderr',
        'status',
        'failures',
        'stderrExcerpt',
        'footer',
      ].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * PHASE 5: PERSIST IMMUTABLE REPORT
   */

  private async persistImmutableReport(
    appRequestId: string,
    contract: VerificationReportContract
  ): Promise<void> {
    this.validateAction('persistImmutableReport');

    await this.prisma.verificationReport.create({
      data: {
        id: contract.reportId,
        appRequestId,
        verificationResultId: contract.verificationResultId,
        reportJson: JSON.stringify(contract),
        generator: contract.generator,
        reportHash: contract.reportHash,
        verificationResultHash: contract.verificationResultHash,
        buildPromptHash: contract.buildPromptHash,
        executionPlanHash: contract.executionPlanHash,
        rulesHash: contract.rulesHash,
        generatedAt: new Date(contract.generatedAt),
      },
    });

    this.logger.info(
      { reportId: contract.reportId, reportHash: contract.reportHash },
      'Verification report persisted'
    );
  }

  /**
   * PHASE 6: EMIT AUDIT EVENT
   */

  private async emitAuditEvent(
    appRequestId: string,
    type: string,
    reportHash: string
  ): Promise<void> {
    this.validateAction('emitAuditEvent');

    this.logger.info(
      { appRequestId, type, reportHash: reportHash.substring(0, 16) + '...' },
      'Audit event emitted'
    );

    // Conductor event emission would go here (if needed)
    // await this.conductor.emitEvent(...) // Private method, so we log instead
  }
}
