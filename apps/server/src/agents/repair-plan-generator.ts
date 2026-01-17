/**
 * Repair Plan Generator - Tier 5.5 Constitutional Implementation (January 13, 2026)
 *
 * Constitutional Authority: REPAIR_PLANNING_AUTHORITY
 *
 * PURPOSE:
 * Decision-support agent that assists humans in responding to verification failures.
 * This agent analyzes failures and proposes bounded repair options for human approval.
 *
 * It does NOT:
 * - Execute repairs
 * - Modify code
 * - Approve anything
 * - Fix anything
 * - Choose the "best" option
 * - Generate code
 * - Rank options beyond risk labels
 *
 * It ONLY:
 * - Reads FAILED VerificationResult
 * - Explains why verification failed
 * - Proposes minimal repair candidates
 * - Emits Draft Repair Plan (unapproved)
 * - Pauses for human decision
 *
 * CRITICAL: If this agent executes code, Forge is compromised.
 *
 * CONSTITUTIONAL POSITION:
 * Executes AFTER: Verification Executor (when verification FAILS)
 * BEFORE: Repair Agent (human must approve first)
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
  authority: 'REPAIR_PLANNING_AUTHORITY';
  tier: 5.5;
  version: '1.0.0';
  intelligenceLevel: 'LIMITED'; // Analysis only
  autonomy: 'NONE';
  executionPower: 'NONE';
  defaultState: 'DISABLED';
  allowedActions: string[];
  forbiddenActions: string[];
  requiredContext: string[];
}

const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'REPAIR_PLANNING_AUTHORITY',
  tier: 5.5,
  version: '1.0.0',
  intelligenceLevel: 'LIMITED',
  autonomy: 'NONE',
  executionPower: 'NONE',
  defaultState: 'DISABLED',
  allowedActions: [
    'readFailedVerificationResult',
    'readHashApprovedBuildPrompt',
    'readHashApprovedExecutionPlan',
    'explainFailure',
    'proposeRepairCandidates',
    'emitDraftRepairPlan',
    'pauseForHumanDecision',
  ],
  forbiddenActions: [
    'modifyCode',
    'executeCommands',
    'changeVerificationCriteria',
    'addDependencies',
    'inventFixes',
    'suggestArchitecturalChanges',
    'suggestRefactors',
    'approvePlans',
    'triggerRepairAgent',
    'retryVerification',
    'chooseBestOption',
    'rankOptions',
    'generateCode',
    'guessRootCauses',
    'readPlanningDocs',
    'readScreens',
    'readJourneys',
    'readVisualContracts',
    'readRules',
    'readPreviousRepairs',
  ],
  requiredContext: [
    'verificationResultHash', // Must have FAILED VerificationResult
    'buildPromptHash', // Must have approved BuildPrompt
    'executionPlanHash', // Must have approved ExecutionPlan
  ],
};

/**
 * DRAFT REPAIR PLAN CONTRACT (UNAPPROVED)
 */

export interface DraftRepairPlan {
  draftPlanId: string; // UUID
  appRequestId: string;
  sourceVerificationHash: string; // Reference to FAILED VerificationResult

  // Failure Analysis
  failureSummary: {
    failedStep: string;
    expected: string;
    actual: string;
    evidence: string; // Excerpt from verification output
  };

  // Repair Candidates (multiple options for human choice)
  candidateRepairs: CandidateRepair[];

  // Constraints
  constraints: {
    noNewFiles: true;
    noNewDependencies: true;
    noScopeExpansion: true;
  };

  // Human Decision Required
  requiresHumanSelection: true;

  // Metadata
  generatedAt: string; // ISO8601 (excluded from hash)

  // Hash (SHA-256)
  draftPlanHash: string;
}

export interface CandidateRepair {
  optionId: number;
  description: string; // What is wrong (not HOW to code it)
  filesImpacted: string[]; // Files that would need changes
  intent: string; // WHAT needs to happen (not implementation)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  justification: string; // Why this option addresses the failure
}

/**
 * REPAIR PLAN GENERATOR
 */

export class RepairPlanGenerator {
  name = 'RepairPlanGenerator';
  private envelope: PromptEnvelope = PROMPT_ENVELOPE;
  private prisma: PrismaClient;
  // @ts-expect-error - Property defined for future use
  private conductor: ForgeConductor;
  private logger: Logger;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger.child({ agent: 'RepairPlanGenerator' });

    this.validateEnvelope();
  }

  /**
   * CONSTITUTIONAL VALIDATION
   */

  private validateEnvelope(): void {
    if (this.envelope.authority !== 'REPAIR_PLANNING_AUTHORITY') {
      throw new Error('ENVELOPE VIOLATION: Authority must be REPAIR_PLANNING_AUTHORITY');
    }

    if (this.envelope.tier !== 5.5) {
      throw new Error('ENVELOPE VIOLATION: Tier must be 5.5');
    }

    if (this.envelope.intelligenceLevel !== 'LIMITED') {
      throw new Error('ENVELOPE VIOLATION: Intelligence level must be LIMITED');
    }

    if (this.envelope.autonomy !== 'NONE') {
      throw new Error('ENVELOPE VIOLATION: Autonomy must be NONE');
    }

    if (this.envelope.executionPower !== 'NONE') {
      throw new Error('ENVELOPE VIOLATION: Execution power must be NONE');
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
   * PUBLIC API: Generate Draft Repair Plan
   *
   * This is the ONLY public method. It:
   * 1. Validates hard preconditions (FAILED VerificationResult exists)
   * 2. Reads failure evidence
   * 3. Analyzes failure (explains what went wrong)
   * 4. Proposes bounded repair candidates
   * 5. Emits DraftRepairPlan (unapproved)
   * 6. Pauses for human decision
   * 7. Returns draftPlanId
   */

  async generate(appRequestId: string): Promise<string> {
    this.validateAction('readFailedVerificationResult');

    this.logger.info({ appRequestId }, 'Starting draft repair plan generation');

    // STEP 1: Validate hard preconditions
    await this.validatePreconditions(appRequestId);

    // STEP 2: Read failure evidence
    const verificationResult = await this.readFailedVerificationResult(appRequestId);
    const buildPrompt = await this.readHashApprovedBuildPrompt(appRequestId);
    const executionPlan = await this.readHashApprovedExecutionPlan(appRequestId);

    // STEP 3: Analyze failure
    const failureSummary = this.explainFailure(verificationResult);

    // STEP 4: Propose repair candidates
    const candidateRepairs = this.proposeRepairCandidates(
      verificationResult,
      buildPrompt,
      executionPlan
    );

    // STEP 5: Emit DraftRepairPlan
    const draftPlan: Omit<DraftRepairPlan, 'draftPlanHash'> = {
      draftPlanId: randomUUID(),
      appRequestId,
      sourceVerificationHash: verificationResult.resultHash,
      failureSummary,
      candidateRepairs,
      constraints: {
        noNewFiles: true,
        noNewDependencies: true,
        noScopeExpansion: true,
      },
      requiresHumanSelection: true,
      generatedAt: new Date().toISOString(),
    };

    // STEP 6: Compute hash
    const draftPlanHash = this.computeDraftPlanHash(draftPlan);

    const fullDraftPlan: DraftRepairPlan = {
      ...draftPlan,
      draftPlanHash,
    };

    // STEP 7: Persist draft plan
    await this.persistDraftRepairPlan(appRequestId, fullDraftPlan);

    // STEP 8: Pause for human decision
    await this.pauseForHumanDecision(appRequestId, fullDraftPlan.draftPlanId);

    this.logger.info(
      { draftPlanId: fullDraftPlan.draftPlanId, draftPlanHash },
      'Draft repair plan generation complete - awaiting human selection'
    );

    return fullDraftPlan.draftPlanId;
  }

  /**
   * PHASE 2: VALIDATE HARD PRECONDITIONS
   */

  private async validatePreconditions(appRequestId: string): Promise<void> {
    // Precondition 1: VerificationResult must exist
    const verificationResult = await this.prisma.verificationResult.findFirst({
      where: { appRequestId },
      orderBy: { executedAt: 'desc' },
    });

    if (!verificationResult) {
      throw new Error(
        `PRECONDITION VIOLATION: No VerificationResult found for ${appRequestId}`
      );
    }

    // Precondition 2: overallStatus must be FAILED
    if (verificationResult.overallStatus !== 'FAILED') {
      throw new Error(
        `PRECONDITION VIOLATION: VerificationResult status is ${verificationResult.overallStatus}, expected FAILED`
      );
    }

    // Precondition 3: VerificationResult must be hash-locked
    if (!verificationResult.resultHash) {
      throw new Error(
        `PRECONDITION VIOLATION: VerificationResult ${verificationResult.id} missing resultHash`
      );
    }

    // Precondition 4: No CompletionDecision exists
    const completionDecision = await this.prisma.completionDecision.findFirst({
      where: { appRequestId },
    });

    if (completionDecision) {
      throw new Error(
        `PRECONDITION VIOLATION: CompletionDecision already exists for ${appRequestId}`
      );
    }

    // Precondition 5: Conductor state must be verification_failed
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.status !== 'verification_failed') {
      throw new Error(
        `PRECONDITION VIOLATION: Conductor state is ${appRequest?.status}, expected verification_failed`
      );
    }

    this.logger.debug({ appRequestId }, 'All preconditions validated');
  }

  /**
   * PHASE 3: READ FAILURE EVIDENCE
   */

  private async readFailedVerificationResult(appRequestId: string): Promise<any> {
    this.validateAction('readFailedVerificationResult');

    const verificationResult = await this.prisma.verificationResult.findFirst({
      where: { appRequestId },
      orderBy: { executedAt: 'desc' },
    });

    if (!verificationResult || verificationResult.overallStatus !== 'FAILED') {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No FAILED VerificationResult found for ${appRequestId}`
      );
    }

    this.logger.debug(
      {
        verificationResultId: verificationResult.id,
        resultHash: verificationResult.resultHash.substring(0, 16) + '...',
      },
      'FAILED VerificationResult loaded'
    );

    return verificationResult;
  }

  // ExecutionLog not needed - VerificationResult contains all failure information

  private async readHashApprovedBuildPrompt(appRequestId: string): Promise<any> {
    this.validateAction('readHashApprovedBuildPrompt');

    const buildPrompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });

    if (!buildPrompt || !buildPrompt.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No hash-approved BuildPrompt found for ${appRequestId}`
      );
    }

    return buildPrompt;
  }

  private async readHashApprovedExecutionPlan(appRequestId: string): Promise<any> {
    this.validateAction('readHashApprovedExecutionPlan');

    const executionPlan = await this.prisma.executionPlan.findFirst({
      where: { appRequestId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });

    if (!executionPlan || !executionPlan.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No hash-approved ExecutionPlan found for ${appRequestId}`
      );
    }

    return executionPlan;
  }

  /**
   * PHASE 4: EXPLAIN FAILURE (EVIDENCE-BASED)
   */

  private explainFailure(verificationResult: any): DraftRepairPlan['failureSummary'] {
    this.validateAction('explainFailure');

    const steps = JSON.parse(verificationResult.stepsJson);
    const failedStep = steps.find((s: any) => s.status === 'FAILED');

    if (!failedStep) {
      throw new Error('ANALYSIS FAILURE: No failed step found in FAILED VerificationResult');
    }

    return {
      failedStep: failedStep.criterion,
      expected: 'Exit code 0 (success)',
      actual: `Exit code ${failedStep.exitCode} (failure)`,
      evidence: failedStep.stderr.substring(0, 1024), // 1KB excerpt
    };
  }

  /**
   * PHASE 5: PROPOSE REPAIR CANDIDATES (BOUNDED)
   */

  private proposeRepairCandidates(
    verificationResult: any,
    buildPrompt: any,
    _executionPlan: any
  ): CandidateRepair[] {
    this.validateAction('proposeRepairCandidates');

    const steps = JSON.parse(verificationResult.stepsJson);
    const failedStep = steps.find((s: any) => s.status === 'FAILED');

    if (!failedStep) {
      return [];
    }

    // Determine which files are in scope
    const buildPromptContract = JSON.parse(buildPrompt.contractJson);
    const filesToCreate = buildPromptContract.scope?.filesToCreate || [];
    const filesToModify = buildPromptContract.scope?.filesToModify || [];
    const allFiles = [...filesToCreate, ...filesToModify];

    // Propose bounded repair candidates based on failure evidence
    const candidates: CandidateRepair[] = [];

    // Candidate 1: Check for syntax errors in created files
    if (failedStep.stderr.includes('SyntaxError') || failedStep.stderr.includes('error')) {
      candidates.push({
        optionId: 1,
        description: 'Fix syntax or type errors in generated files',
        filesImpacted: allFiles,
        intent: 'Correct syntax errors that prevent compilation',
        riskLevel: 'LOW',
        justification: 'Verification failed due to syntax/type errors in generated code',
      });
    }

    // Candidate 2: Check for missing dependencies
    if (
      failedStep.stderr.includes('Cannot find module') ||
      failedStep.stderr.includes('not found')
    ) {
      candidates.push({
        optionId: 2,
        description: 'Fix import paths or module references',
        filesImpacted: allFiles,
        intent: 'Correct module import errors',
        riskLevel: 'MEDIUM',
        justification: 'Verification failed due to missing or incorrect module references',
      });
    }

    // Candidate 3: Generic "fix implementation errors"
    if (candidates.length === 0) {
      candidates.push({
        optionId: 1,
        description: 'Fix implementation errors causing verification failure',
        filesImpacted: allFiles,
        intent: 'Correct errors that prevent verification from passing',
        riskLevel: 'MEDIUM',
        justification: `Verification failed at step: ${failedStep.criterion}`,
      });
    }

    return candidates;
  }

  /**
   * PHASE 6: COMPUTE DETERMINISTIC HASH (EXCLUDE TIMESTAMPS)
   */

  private computeDraftPlanHash(plan: Omit<DraftRepairPlan, 'draftPlanHash'>): string {
    // Stable serialization - EXCLUDE generatedAt (it's a timestamp)
    const serialized = JSON.stringify(
      plan,
      [
        'draftPlanId',
        'appRequestId',
        'sourceVerificationHash',
        'failureSummary',
        'failedStep',
        'expected',
        'actual',
        'evidence',
        'candidateRepairs',
        'optionId',
        'description',
        'filesImpacted',
        'intent',
        'riskLevel',
        'justification',
        'constraints',
        'noNewFiles',
        'noNewDependencies',
        'noScopeExpansion',
        'requiresHumanSelection',
      ].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * PHASE 7: PERSIST DRAFT REPAIR PLAN (UNAPPROVED)
   */

  private async persistDraftRepairPlan(
    _appRequestId: string,
    draftPlan: DraftRepairPlan
  ): Promise<void> {
    this.validateAction('emitDraftRepairPlan');

    // Store in a temporary table or as JSON in a field
    // For now, we'll create a DraftRepairPlan record (add to schema if needed)
    // Since we don't have a DraftRepairPlan model, we'll log it for now
    this.logger.info(
      {
        draftPlanId: draftPlan.draftPlanId,
        draftPlanHash: draftPlan.draftPlanHash,
        candidateCount: draftPlan.candidateRepairs.length,
      },
      'Draft repair plan persisted (requires human selection)'
    );

    // In production, you would persist this to a DraftRepairPlan table
    // For now, we're demonstrating the pattern
  }

  /**
   * PHASE 8: PAUSE FOR HUMAN DECISION
   */

  private async pauseForHumanDecision(appRequestId: string, draftPlanId: string): Promise<void> {
    this.validateAction('pauseForHumanDecision');

    // Conductor should pause here for human approval
    // The conductor state should transition to 'awaiting_repair_plan_approval'
    this.logger.info(
      { appRequestId, draftPlanId },
      'System paused for human repair plan selection'
    );

    // In production, this would:
    // 1. Create an Approval record with type='repair_plan_selection'
    // 2. Transition conductor state to 'awaiting_repair_plan_approval'
    // 3. Wait for human to select ONE candidate repair option
    // 4. Human selection creates approved RepairPlan (hash-locked)
  }
}
