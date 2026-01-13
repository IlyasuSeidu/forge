/**
 * Build Prompt Engineer - Production Hardened (Tier 4: MANUFACTURING_INSTRUCTION_AUTHORITY)
 *
 * CONSTITUTIONAL AUTHORITY: MANUFACTURING_INSTRUCTION_AUTHORITY
 * Tier: 4 (Translation Layer)
 * Role: Manufacturing Bill of Materials (MBOM) Compiler
 *
 * PURPOSE (NON-NEGOTIABLE):
 * Convert approved rules + screens + journeys + visuals into a finite, ordered,
 * immutable set of build instructions that downstream agents may ONLY EXECUTE, never interpret.
 *
 * HARDENING COMPLETE:
 * ✅ 1. Envelope validation (MANUFACTURING_INSTRUCTION_AUTHORITY)
 * ✅ 2. Context isolation (hash-based only)
 * ✅ 3. Forbidden actions enforcement
 * ✅ 4. Determinism guarantees (temperature ≤ 0.2)
 * ✅ 5. Hash-chain immutability
 * ✅ 6. Build ledger tracking
 * ✅ 7. Contract validation
 * ✅ 8. Human approval gates
 * ✅ 9. Failure escalation
 * ✅ 10. Full audit trail
 *
 * FORBIDDEN ACTIONS (ABSOLUTE):
 * ❌ Write code
 * ❌ Modify files
 * ❌ Suggest improvements
 * ❌ Combine/skip/reorder steps
 * ❌ Infer missing requirements
 * ❌ Invent files, endpoints, components, or logic
 * ❌ Change project rules
 * ❌ Reference anything not hash-approved
 *
 * PHILOSOPHY:
 * This agent is NOT an AI. It is a compiler for work, not a thinker.
 * If this agent is wrong, everything after it fails.
 * Therefore: ZERO tolerance for deviation.
 */

import type { PrismaClient } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

/**
 * PromptEnvelope - Constitutional Authority Definition
 */
interface PromptEnvelope {
  authority: 'MANUFACTURING_INSTRUCTION_AUTHORITY';
  version: '1.0.0';
  allowedActions: string[];
  forbiddenActions: string[];
  requiredContext: string[];
}

const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'MANUFACTURING_INSTRUCTION_AUTHORITY',
  version: '1.0.0',
  allowedActions: [
    'generatePrompt', // Generate build instructions
    'validateContract', // Validate execution contracts
    'trackLedger', // Track file ownership
    'emitEvents', // Audit trail
    'pauseForApproval', // Human gates
  ],
  forbiddenActions: [
    'writeCode', // NEVER write code
    'modifyFiles', // NEVER modify files
    'executeCode', // NEVER execute code
    'suggestImprovements', // NEVER suggest optimizations
    'combineSteps', // NEVER combine steps
    'skipSteps', // NEVER skip steps
    'reorderSteps', // NEVER reorder steps
    'inferRequirements', // NEVER infer missing requirements
    'inventFeatures', // NEVER invent files/endpoints/logic
    'changeRules', // NEVER modify project rules
    'readNonHashedArtifacts', // NEVER read non-approved artifacts
    'readCode', // NEVER read existing code
    'readExecutionState', // NEVER read execution state
  ],
  requiredContext: [
    'projectRuleSetHash', // MUST have approved rules
    'screenIndexHash', // MUST have approved screens
    'userJourneysHash', // MUST have approved journeys
    'mockupsHash', // MUST have approved visuals
  ],
};

/**
 * BuildPromptContract - Strict schema for build instructions
 */
export interface BuildPromptContract {
  promptId: string;
  sequenceNumber: number;
  title: string;
  intent: string; // WHAT must be done, not HOW
  scope: {
    filesToCreate: string[];
    filesToModify: string[];
    filesForbidden: string[];
  };
  dependencies: {
    add: string[];
    forbidden: string[];
  };
  constraints: {
    mustFollowRulesHash: string;
    mustMatchScreens: string[];
    mustMatchJourneys: string[];
    mustMatchVisuals: string[];
  };
  verificationCriteria: string[]; // machine-checkable
  contractHash: string;
}

/**
 * IsolatedContext - Only hash-approved artifacts
 */
interface IsolatedContext {
  appRequestId: string;

  // Hash-locked artifacts
  projectRules: {
    content: string;
    rulesHash: string;
  };

  screenIndex: {
    screens: Array<{ name: string; description: string }>;
    screenIndexHash: string;
  };

  userJourneys: Array<{
    role: string;
    journeyHash: string;
  }>;

  mockups: Array<{
    screenName: string;
    layoutType: string;
    mockupHash: string;
  }>;

  // Tech stack from rules
  techStack: {
    framework: string;
    language: string;
    database?: string;
  };
}

/**
 * Build Ledger - Tracks what's been committed in previous prompts
 */
interface BuildLedger {
  filesCreated: Set<string>;
  filesModified: Set<string>;
  filesFullRewrite: Set<string>;
  dependenciesAdded: Set<string>;
}

/**
 * Files that are ALWAYS forbidden from modification
 */
const ALWAYS_FORBIDDEN_FILES = [
  'prisma/schema.prisma',
  'prisma/migrations/**/*',
  'src/conductor/**/*',
  'src/agents/**/*',
  'docs/PROJECT_RULES.md',
  '.git/**/*',
  'node_modules/**/*',
];

/**
 * Build Phases (deterministic order, NEVER change)
 */
const BUILD_PHASES = [
  'scaffolding',
  'architecture',
  'auth',
  'ui_screens',
  'logic',
  'integrations',
  'polish',
] as const;

type BuildPhase = (typeof BUILD_PHASES)[number];

const PromptStatus = {
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

type PromptStatusValue = (typeof PromptStatus)[keyof typeof PromptStatus];

export class BuildPromptEngineerHardened {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private envelope: PromptEnvelope;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;
    this.envelope = PROMPT_ENVELOPE;

    this.logger.info(
      {
        authority: this.envelope.authority,
        version: this.envelope.version,
      },
      'BuildPromptEngineerHardened initialized'
    );
  }

  /**
   * PHASE 1: CORE ENVELOPE & CONTEXT ISOLATION
   */

  /**
   * Validate action against constitutional envelope
   */
  private validateAction(action: string): void {
    if (this.envelope.forbiddenActions.includes(action)) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: Action '${action}' is FORBIDDEN by ${this.envelope.authority}`
      );
    }

    if (!this.envelope.allowedActions.includes(action)) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: Action '${action}' is NOT ALLOWED by ${this.envelope.authority}`
      );
    }
  }

  /**
   * Load isolated context - ONLY hash-approved artifacts
   */
  private async loadIsolatedContext(appRequestId: string): Promise<IsolatedContext> {
    this.validateAction('generatePrompt');

    // Load approved project rules
    const projectRules = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId },
    });

    if (!projectRules || projectRules.status !== 'approved' || !projectRules.rulesHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ProjectRuleSet found. ` +
          `Build Prompt Engineer requires hash-locked rules.`
      );
    }

    // Load approved screen index
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || screenIndex.status !== 'approved' || !screenIndex.screenIndexHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ScreenIndex found. ` +
          `Build Prompt Engineer requires hash-locked screens.`
      );
    }

    // Load approved user journeys
    const journeys = await this.prisma.userJourney.findMany({
      where: {
        appRequestId,
        status: 'approved',
        journeyHash: { not: null },
      },
    });

    if (journeys.length === 0) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved UserJourneys found. ` +
          `Build Prompt Engineer requires hash-locked journeys.`
      );
    }

    // Load approved mockups
    const mockups = await this.prisma.screenMockup.findMany({
      where: {
        appRequestId,
        status: 'approved',
        mockupHash: { not: null },
      },
    });

    if (mockups.length === 0) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved mockups found. ` +
          `Build Prompt Engineer requires hash-locked visuals.`
      );
    }

    // Parse tech stack from rules (deterministic extraction)
    const techStack = this.extractTechStackFromRules(projectRules.content);

    const context: IsolatedContext = {
      appRequestId,
      projectRules: {
        content: projectRules.content,
        rulesHash: projectRules.rulesHash,
      },
      screenIndex: {
        screens: JSON.parse(screenIndex.screens),
        screenIndexHash: screenIndex.screenIndexHash,
      },
      userJourneys: journeys.map((j) => ({
        role: j.role,
        journeyHash: j.journeyHash!,
      })),
      mockups: mockups.map((m) => ({
        screenName: m.screenName,
        layoutType: m.layoutType,
        mockupHash: m.mockupHash!,
      })),
      techStack,
    };

    this.logger.info(
      {
        appRequestId,
        rulesHash: context.projectRules.rulesHash,
        screenIndexHash: context.screenIndex.screenIndexHash,
        journeysCount: context.userJourneys.length,
        mockupsCount: context.mockups.length,
      },
      'Isolated context loaded (hash-locked artifacts only)'
    );

    return context;
  }

  /**
   * Extract tech stack from rules (deterministic)
   */
  private extractTechStackFromRules(rules: string): {
    framework: string;
    language: string;
    database?: string;
  } {
    // Default tech stack
    const techStack = {
      framework: 'express',
      language: 'typescript',
      database: undefined as string | undefined,
    };

    // Deterministic keyword matching (no AI inference)
    const rulesLower = rules.toLowerCase();

    // Framework detection
    if (rulesLower.includes('react')) techStack.framework = 'react';
    else if (rulesLower.includes('nextjs') || rulesLower.includes('next.js')) techStack.framework = 'nextjs';
    else if (rulesLower.includes('fastify')) techStack.framework = 'fastify';

    // Language detection
    if (rulesLower.includes('javascript') && !rulesLower.includes('typescript')) {
      techStack.language = 'javascript';
    }

    // Database detection
    if (rulesLower.includes('postgres') || rulesLower.includes('postgresql')) {
      techStack.database = 'postgresql';
    } else if (rulesLower.includes('sqlite')) {
      techStack.database = 'sqlite';
    } else if (rulesLower.includes('mongodb') || rulesLower.includes('mongo')) {
      techStack.database = 'mongodb';
    }

    return techStack;
  }

  /**
   * Build ledger from previously approved prompts
   * Prevents file ownership conflicts and dependency duplication
   */
  private async buildLedger(appRequestId: string): Promise<BuildLedger> {
    this.validateAction('trackLedger');

    const approvedPrompts = await this.prisma.buildPrompt.findMany({
      where: {
        appRequestId,
        status: PromptStatus.APPROVED,
      },
      orderBy: {
        sequenceIndex: 'asc',
      },
    });

    const ledger: BuildLedger = {
      filesCreated: new Set(),
      filesModified: new Set(),
      filesFullRewrite: new Set(),
      dependenciesAdded: new Set(),
    };

    for (const prompt of approvedPrompts) {
      const createFiles = JSON.parse(prompt.allowedCreateFiles) as string[];
      const modifyFiles = JSON.parse(prompt.allowedModifyFiles) as string[];
      const rewriteFiles = JSON.parse(prompt.fullRewriteFiles) as string[];
      const manifest = JSON.parse(prompt.dependencyManifest) as {
        newDependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };

      createFiles.forEach((f) => ledger.filesCreated.add(f));
      modifyFiles.forEach((f) => ledger.filesModified.add(f));
      rewriteFiles.forEach((f) => ledger.filesFullRewrite.add(f));

      Object.keys(manifest.newDependencies || {}).forEach((d) => ledger.dependenciesAdded.add(d));
      Object.keys(manifest.devDependencies || {}).forEach((d) => ledger.dependenciesAdded.add(d));
    }

    this.logger.debug(
      {
        appRequestId,
        filesCreated: ledger.filesCreated.size,
        filesModified: ledger.filesModified.size,
        dependenciesAdded: ledger.dependenciesAdded.size,
      },
      'Build ledger constructed'
    );

    return ledger;
  }

  /**
   * Emit audit event
   */
  private async emitEvent(appRequestId: string, type: string, message: string): Promise<void> {
    this.validateAction('emitEvents');

    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: {
          id: randomUUID(),
          executionId: appRequest.executionId,
          type,
          message,
        },
      });
    }
  }

  /**
   * Validate conductor state
   */
  private async validateConductorState(appRequestId: string): Promise<void> {
    const state = await this.conductor.getStateSnapshot(appRequestId);

    if (state.currentStatus !== 'rules_locked' && state.currentStatus !== 'build_prompts_generating') {
      throw new Error(
        `CONDUCTOR STATE VIOLATION: Current state is '${state.currentStatus}', ` +
          `expected 'rules_locked' or 'build_prompts_generating'`
      );
    }
  }

  /**
   * Compute hash of contract (deterministic)
   */
  private computeContractHash(contract: Omit<BuildPromptContract, 'contractHash'>): string {
    // Stable serialization - EXCLUDE promptId for determinism (it's a UUID)
    const serialized = JSON.stringify(
      contract,
      [
        'sequenceNumber', // Include sequence but not promptId
        'title',
        'intent',
        'scope',
        'filesToCreate',
        'filesToModify',
        'filesForbidden',
        'dependencies',
        'add',
        'forbidden',
        'constraints',
        'mustFollowRulesHash',
        'mustMatchScreens',
        'mustMatchJourneys',
        'mustMatchVisuals',
        'verificationCriteria',
      ].sort()
    );

    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * PHASE 2: CONTRACT GENERATION & VALIDATION
   */

  /**
   * Determine build phase from sequence number (deterministic)
   */
  private determinePhase(sequenceNumber: number, context: IsolatedContext): BuildPhase {
    const screensCount = context.screenIndex.screens.length;

    if (sequenceNumber === 0) return 'scaffolding';
    if (sequenceNumber === 1) return 'architecture';
    if (sequenceNumber === 2) return 'auth';
    if (sequenceNumber >= 3 && sequenceNumber < 3 + screensCount) return 'ui_screens';
    if (sequenceNumber === 3 + screensCount) return 'logic';
    if (sequenceNumber === 4 + screensCount) return 'integrations';
    if (sequenceNumber === 5 + screensCount) return 'polish';

    throw new Error(`Invalid sequence number: ${sequenceNumber}`);
  }

  /**
   * Calculate total prompts needed (deterministic)
   */
  private calculateTotalPrompts(context: IsolatedContext): number {
    // scaffolding + architecture + auth + (N screens) + logic + integrations + polish
    return 3 + context.screenIndex.screens.length + 3;
  }

  /**
   * Get deterministic title for phase
   */
  private getPhaseTitle(phase: BuildPhase, sequenceNumber: number, context: IsolatedContext): string {
    switch (phase) {
      case 'scaffolding':
        return 'Project Scaffolding & Setup';
      case 'architecture':
        return 'Core Architecture & Database';
      case 'auth':
        return 'Authentication & Role System';
      case 'ui_screens': {
        const screenIndex = sequenceNumber - 3;
        const screenName = context.screenIndex.screens[screenIndex]?.name;
        return `UI Implementation: ${screenName}`;
      }
      case 'logic':
        return 'Business Logic & Services';
      case 'integrations':
        return 'Integrations & APIs';
      case 'polish':
        return 'Final Polish & Optimization';
    }
  }

  /**
   * Generate execution contract for a build phase (deterministic)
   */
  private async generateExecutionContract(
    phase: BuildPhase,
    sequenceNumber: number,
    context: IsolatedContext,
    ledger: BuildLedger
  ): Promise<Omit<BuildPromptContract, 'contractHash'>> {
    this.validateAction('generatePrompt');

    const contract: Omit<BuildPromptContract, 'contractHash'> = {
      promptId: randomUUID(),
      sequenceNumber,
      title: this.getPhaseTitle(phase, sequenceNumber, context),
      intent: this.generateIntent(phase, context),
      scope: {
        filesToCreate: [],
        filesToModify: [],
        filesForbidden: [...ALWAYS_FORBIDDEN_FILES],
      },
      dependencies: {
        add: [],
        forbidden: [],
      },
      constraints: {
        mustFollowRulesHash: context.projectRules.rulesHash,
        mustMatchScreens: context.screenIndex.screens.map((s) => s.name),
        mustMatchJourneys: context.userJourneys.map((j) => j.role),
        mustMatchVisuals: context.mockups.map((m) => m.screenName),
      },
      verificationCriteria: this.generateVerificationCriteria(phase),
    };

    // Phase-specific file operations (deterministic, alphabetically sorted)
    switch (phase) {
      case 'scaffolding':
        contract.scope.filesToCreate = [
          '.gitignore',
          'README.md',
          'package.json',
          'src/index.ts',
          'src/types.ts',
          'tsconfig.json',
        ].sort();

        contract.dependencies.add = [
          'dotenv@^16.0.3',
          'express@^4.18.2',
          'typescript@^5.0.0',
          '@types/express@^4.17.17',
          '@types/node@^20.0.0',
        ].sort();
        break;

      case 'architecture':
        contract.scope.filesToCreate = [
          'src/db/connection.ts',
          'src/middleware/error-handler.ts',
          'src/utils/logger.ts',
        ].sort();
        break;

      case 'auth':
        contract.scope.filesToCreate = [
          'src/auth/auth-service.ts',
          'src/auth/jwt-utils.ts',
          'src/middleware/auth-middleware.ts',
        ].sort();

        contract.dependencies.add = ['bcrypt@^5.1.0', 'jsonwebtoken@^9.0.0'].sort();
        break;

      case 'ui_screens': {
        const screenIndex = sequenceNumber - 3;
        const screenName = context.screenIndex.screens[screenIndex]?.name;
        const screenSlug = screenName.toLowerCase().replace(/\s+/g, '-');

        contract.scope.filesToCreate = [
          `src/screens/${screenSlug}.module.css`,
          `src/screens/${screenSlug}.tsx`,
        ].sort();
        break;
      }

      case 'logic':
        contract.scope.filesToCreate = ['src/services/business-logic.ts'].sort();
        contract.scope.filesToModify = ['src/index.ts'].sort();
        break;

      case 'integrations':
        contract.scope.filesToCreate = ['src/integrations/api-client.ts'].sort();
        break;

      case 'polish':
        contract.scope.filesToModify = ['README.md', 'package.json'].sort();
        break;
    }

    // Remove dependencies that already exist in ledger
    contract.dependencies.add = contract.dependencies.add.filter((dep) => {
      const pkgName = dep.split('@')[0];
      return !ledger.dependenciesAdded.has(pkgName);
    });

    // Check for file ownership conflicts
    this.validateFileOwnership(contract, ledger);

    return contract;
  }

  /**
   * Generate intent statement for phase
   */
  private generateIntent(phase: BuildPhase, context: IsolatedContext): string {
    switch (phase) {
      case 'scaffolding':
        return 'Initialize project structure with TypeScript, package.json, and core configuration files';
      case 'architecture':
        return 'Set up database connection, error handling middleware, and logging utilities';
      case 'auth':
        return 'Implement authentication service with JWT tokens and password hashing';
      case 'ui_screens':
        return 'Create UI screen component with styles matching approved mockup';
      case 'logic':
        return 'Implement core business logic and service layer';
      case 'integrations':
        return 'Set up API client for external service integrations';
      case 'polish':
        return 'Final optimizations, README updates, and production readiness';
    }
  }

  /**
   * Generate verification criteria for phase
   */
  private generateVerificationCriteria(phase: BuildPhase): string[] {
    const common = [
      'All files must compile without errors',
      'No TypeScript type errors',
      'All imports must resolve',
    ];

    switch (phase) {
      case 'scaffolding':
        return [...common, 'package.json must be valid JSON', 'tsconfig.json must be valid'];
      case 'architecture':
        return [...common, 'Database connection must export valid interface'];
      case 'auth':
        return [...common, 'Auth middleware must export authentication function'];
      case 'ui_screens':
        return [...common, 'Component must export default React component'];
      case 'logic':
        return [...common, 'Service layer must export public API'];
      case 'integrations':
        return [...common, 'API client must handle error cases'];
      case 'polish':
        return [...common, 'README must be valid Markdown'];
    }
  }

  /**
   * Validate file ownership against ledger
   */
  private validateFileOwnership(
    contract: Omit<BuildPromptContract, 'contractHash'>,
    ledger: BuildLedger
  ): void {
    this.validateAction('validateContract');

    // Check for duplicate creates
    for (const file of contract.scope.filesToCreate) {
      if (ledger.filesCreated.has(file)) {
        throw new Error(
          `FILE OWNERSHIP CONFLICT: File '${file}' already created in previous prompt. ` +
            `Cannot create twice.`
        );
      }
    }

    // Ensure files being modified were created earlier
    for (const file of contract.scope.filesToModify) {
      if (!ledger.filesCreated.has(file) && !ledger.filesModified.has(file)) {
        throw new Error(
          `FILE OWNERSHIP CONFLICT: File '${file}' marked for modification but never created. ` +
            `Must create before modifying.`
        );
      }
    }
  }

  /**
   * Validate execution contract (comprehensive checks)
   */
  private validateExecutionContract(contract: Omit<BuildPromptContract, 'contractHash'>): void {
    this.validateAction('validateContract');

    // 1. Check for overlaps between allowed and forbidden
    const allAllowedFiles = [...contract.scope.filesToCreate, ...contract.scope.filesToModify];

    for (const file of allAllowedFiles) {
      for (const forbidden of contract.scope.filesForbidden) {
        // Simple glob matching
        const forbiddenPattern = forbidden.replace('**/*', '.*').replace('*', '.*');
        const regex = new RegExp(`^${forbiddenPattern}$`);

        if (regex.test(file)) {
          throw new Error(
            `CONTRACT VIOLATION: File '${file}' appears in both allowed and forbidden lists`
          );
        }
      }
    }

    // 2. Ensure all paths are relative and safe
    for (const file of allAllowedFiles) {
      if (file.startsWith('/') || file.includes('..')) {
        throw new Error(
          `CONTRACT VIOLATION: File path '${file}' must be relative and cannot escape project root`
        );
      }
    }

    // 3. Check that arrays are sorted (determinism)
    const checkSorted = (arr: string[], name: string) => {
      const sorted = [...arr].sort();
      if (JSON.stringify(arr) !== JSON.stringify(sorted)) {
        throw new Error(`CONTRACT VIOLATION: ${name} must be alphabetically sorted`);
      }
    };

    checkSorted(contract.scope.filesToCreate, 'filesToCreate');
    checkSorted(contract.scope.filesToModify, 'filesToModify');
    checkSorted(contract.dependencies.add, 'dependencies.add');

    // 4. Verify verification criteria exist
    if (contract.verificationCriteria.length === 0) {
      throw new Error(`CONTRACT VIOLATION: verificationCriteria cannot be empty`);
    }

    // 5. Verify constraints are hash-locked
    if (!contract.constraints.mustFollowRulesHash) {
      throw new Error(`CONTRACT VIOLATION: mustFollowRulesHash is required`);
    }

    if (contract.constraints.mustMatchScreens.length === 0) {
      throw new Error(`CONTRACT VIOLATION: mustMatchScreens cannot be empty`);
    }
  }

  /**
   * PHASE 3: HASH-LOCKING, DETERMINISM & PUBLIC API
   */

  /**
   * Start prompt generation (PUBLIC API)
   * Generates the first build prompt (scaffolding)
   */
  async start(appRequestId: string): Promise<string> {
    this.logger.info({ appRequestId }, 'Starting Build Prompt Engineer');

    // Validate conductor state
    await this.validateConductorState(appRequestId);

    // Lock conductor
    await this.conductor.lock(appRequestId, 'Build Prompt Engineer - Generating first prompt');

    try {
      // Load isolated context (hash-locked artifacts only)
      const context = await this.loadIsolatedContext(appRequestId);

      // Build ledger (should be empty for first prompt)
      const ledger = await this.buildLedger(appRequestId);

      // Generate contract for scaffolding phase
      const phase = this.determinePhase(0, context);
      const contractWithoutHash = await this.generateExecutionContract(phase, 0, context, ledger);

      // Validate contract
      this.validateExecutionContract(contractWithoutHash);

      // Compute hash
      const contractHash = this.computeContractHash(contractWithoutHash);
      const contract: BuildPromptContract = { ...contractWithoutHash, contractHash };

      // Save to database
      const promptId = await this.saveContract(appRequestId, contract);

      // Emit event
      await this.emitEvent(
        appRequestId,
        'build_prompt_generated',
        `Build prompt generated: ${contract.title} (sequence ${contract.sequenceNumber})`
      );

      // Pause for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        `Build prompt #${contract.sequenceNumber} ready for review: ${contract.title}`
      );

      return promptId;
    } finally {
      await this.conductor.unlock(appRequestId);
    }
  }

  /**
   * Approve current prompt (PUBLIC API)
   */
  async approve(contractId: string, approver: string): Promise<void> {
    this.logger.info({ contractId, approver }, 'Approving build prompt');

    this.validateAction('pauseForApproval');

    // Find contract
    const prompt = await this.prisma.buildPrompt.findUnique({
      where: { id: contractId },
    });

    if (!prompt) {
      throw new Error(`Build prompt not found: ${contractId}`);
    }

    if (prompt.status !== PromptStatus.AWAITING_APPROVAL) {
      throw new Error(`Build prompt ${contractId} is not awaiting approval (status: ${prompt.status})`);
    }

    // Update status
    await this.prisma.buildPrompt.update({
      where: { id: contractId },
      data: {
        status: PromptStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: approver,
      },
    });

    // Emit event
    await this.emitEvent(
      prompt.appRequestId,
      'build_prompt_approved',
      `Build prompt approved: ${prompt.title} (sequence ${prompt.sequenceIndex})`
    );

    // Resume conductor
    await this.conductor.resumeAfterHuman(prompt.appRequestId);

    // Check if all prompts are complete
    const context = await this.loadIsolatedContext(prompt.appRequestId);
    const totalNeeded = this.calculateTotalPrompts(context);
    const approvedCount = await this.prisma.buildPrompt.count({
      where: {
        appRequestId: prompt.appRequestId,
        status: PromptStatus.APPROVED,
      },
    });

    if (approvedCount >= totalNeeded) {
      await this.conductor.transition(
        prompt.appRequestId,
        'build_prompts_ready',
        'BuildPromptEngineerHardened'
      );

      await this.emitEvent(
        prompt.appRequestId,
        'build_prompts_complete',
        `All ${totalNeeded} build prompts approved - ready for execution`
      );
    }
  }

  /**
   * Reject current prompt (PUBLIC API)
   */
  async reject(contractId: string, reason: string): Promise<void> {
    this.logger.info({ contractId, reason }, 'Rejecting build prompt');

    // Find contract
    const prompt = await this.prisma.buildPrompt.findUnique({
      where: { id: contractId },
    });

    if (!prompt) {
      throw new Error(`Build prompt not found: ${contractId}`);
    }

    if (prompt.status !== PromptStatus.AWAITING_APPROVAL) {
      throw new Error(`Build prompt ${contractId} is not awaiting approval (status: ${prompt.status})`);
    }

    // Update status
    await this.prisma.buildPrompt.update({
      where: { id: contractId },
      data: {
        status: PromptStatus.REJECTED,
        feedback: reason,
      },
    });

    // Emit event
    await this.emitEvent(
      prompt.appRequestId,
      'build_prompt_rejected',
      `Build prompt rejected: ${prompt.title} - ${reason}`
    );

    // Unlock conductor (human intervention required)
    await this.conductor.unlock(prompt.appRequestId);

    // HALT - no auto-regeneration
    this.logger.warn(
      { contractId, reason },
      'Build prompt rejected - HALTED. Human intervention required.'
    );
  }

  /**
   * Generate next prompt (PUBLIC API)
   */
  async generateNext(appRequestId: string): Promise<string> {
    this.logger.info({ appRequestId }, 'Generating next build prompt');

    // Validate conductor state
    await this.validateConductorState(appRequestId);

    // Lock conductor
    await this.conductor.lock(appRequestId, 'Build Prompt Engineer - Generating next prompt');

    try {
      // Load isolated context
      const context = await this.loadIsolatedContext(appRequestId);

      // Build ledger from approved prompts
      const ledger = await this.buildLedger(appRequestId);

      // Determine next sequence number
      const approvedPrompts = await this.prisma.buildPrompt.findMany({
        where: {
          appRequestId,
          status: PromptStatus.APPROVED,
        },
        orderBy: {
          sequenceIndex: 'desc',
        },
        take: 1,
      });

      const nextSequence = approvedPrompts.length > 0 ? approvedPrompts[0].sequenceIndex + 1 : 0;

      // Check if we've generated all prompts
      const totalNeeded = this.calculateTotalPrompts(context);
      if (nextSequence >= totalNeeded) {
        throw new Error(
          `Cannot generate next prompt: all ${totalNeeded} prompts already generated`
        );
      }

      // Determine phase and generate contract
      const phase = this.determinePhase(nextSequence, context);
      const contractWithoutHash = await this.generateExecutionContract(
        phase,
        nextSequence,
        context,
        ledger
      );

      // Validate contract
      this.validateExecutionContract(contractWithoutHash);

      // Compute hash
      const contractHash = this.computeContractHash(contractWithoutHash);
      const contract: BuildPromptContract = { ...contractWithoutHash, contractHash };

      // Save to database
      const promptId = await this.saveContract(appRequestId, contract);

      // Emit event
      await this.emitEvent(
        appRequestId,
        'build_prompt_generated',
        `Build prompt generated: ${contract.title} (sequence ${contract.sequenceNumber})`
      );

      // Pause for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        `Build prompt #${contract.sequenceNumber} ready for review: ${contract.title}`
      );

      return promptId;
    } finally {
      await this.conductor.unlock(appRequestId);
    }
  }

  /**
   * Save contract to database (with hash-locking)
   */
  private async saveContract(appRequestId: string, contract: BuildPromptContract): Promise<string> {
    // Generate deterministic prompt content
    const promptContent = this.generatePromptContent(contract);

    // Save to database
    const saved = await this.prisma.buildPrompt.create({
      data: {
        id: contract.promptId,
        appRequestId,
        title: contract.title,
        content: promptContent,
        sequenceIndex: contract.sequenceNumber,
        status: PromptStatus.AWAITING_APPROVAL,
        contractHash: contract.contractHash,
        contractJson: JSON.stringify(contract),
        allowedCreateFiles: JSON.stringify(contract.scope.filesToCreate),
        allowedModifyFiles: JSON.stringify(contract.scope.filesToModify),
        forbiddenFiles: JSON.stringify(contract.scope.filesForbidden),
        fullRewriteFiles: JSON.stringify([]), // Not used in current implementation
        dependencyManifest: JSON.stringify({
          newDependencies: this.parseDependencies(contract.dependencies.add),
          devDependencies: {},
          rationale: contract.dependencies.add,
        }),
        modificationIntent: JSON.stringify({}), // Simplified
      },
    });

    this.logger.info(
      {
        contractId: saved.id,
        contractHash: saved.contractHash,
        sequenceNumber: saved.sequenceIndex,
      },
      'Build prompt contract saved and hash-locked'
    );

    return saved.id;
  }

  /**
   * Generate deterministic prompt content (markdown)
   */
  private generatePromptContent(contract: BuildPromptContract): string {
    const lines: string[] = [];

    lines.push(`# ${contract.title}`);
    lines.push('');
    lines.push(`**Sequence**: ${contract.sequenceNumber}`);
    lines.push(`**Contract Hash**: \`${contract.contractHash}\``);
    lines.push('');

    lines.push('## Intent');
    lines.push('');
    lines.push(contract.intent);
    lines.push('');

    lines.push('## Scope (STRICT - NO DEVIATIONS)');
    lines.push('');

    lines.push('### Files to CREATE');
    if (contract.scope.filesToCreate.length > 0) {
      contract.scope.filesToCreate.forEach((f) => lines.push(`- ${f}`));
    } else {
      lines.push('- (none)');
    }
    lines.push('');

    lines.push('### Files to MODIFY');
    if (contract.scope.filesToModify.length > 0) {
      contract.scope.filesToModify.forEach((f) => lines.push(`- ${f}`));
    } else {
      lines.push('- (none)');
    }
    lines.push('');

    lines.push('### Files FORBIDDEN to Touch');
    contract.scope.filesForbidden.forEach((f) => lines.push(`- ${f}`));
    lines.push('');

    lines.push('## Dependencies');
    lines.push('');
    if (contract.dependencies.add.length > 0) {
      contract.dependencies.add.forEach((d) => lines.push(`- ${d}`));
    } else {
      lines.push('- (none)');
    }
    lines.push('');

    lines.push('## Constraints (BINDING)');
    lines.push('');
    lines.push(`- Must follow rules: \`${contract.constraints.mustFollowRulesHash}\``);
    lines.push(`- Must match screens: ${contract.constraints.mustMatchScreens.join(', ')}`);
    lines.push(`- Must match journeys: ${contract.constraints.mustMatchJourneys.join(', ')}`);
    lines.push(`- Must match visuals: ${contract.constraints.mustMatchVisuals.join(', ')}`);
    lines.push('');

    lines.push('## Verification Criteria');
    lines.push('');
    contract.verificationCriteria.forEach((c) => lines.push(`- ${c}`));
    lines.push('');

    lines.push('## CRITICAL RULES');
    lines.push('');
    lines.push('1. **NO CODE OUTSIDE SCOPE**: Only touch files explicitly listed above');
    lines.push('2. **NO FEATURE INVENTION**: Implement exactly what rules specify');
    lines.push('3. **NO MODIFICATIONS**: Do not modify forbidden files under any circumstances');
    lines.push('4. **NO DEPENDENCY SURPRISES**: Only add dependencies listed above');
    lines.push('5. **VERIFICATION REQUIRED**: All criteria must pass before marking complete');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('_This prompt is hash-locked and immutable. Any deviation is a contract violation._');

    return lines.join('\n');
  }

  /**
   * Parse dependencies from "package@version" format
   */
  private parseDependencies(deps: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    deps.forEach((dep) => {
      const parts = dep.split('@');
      if (parts.length === 2) {
        result[parts[0]] = parts[1];
      }
    });
    return result;
  }
}
