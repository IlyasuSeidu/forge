/**
 * Build Prompt Engineer - Tier 4 Translation Layer Agent
 *
 * THE BRIDGE BETWEEN DESIGN AND EXECUTION
 *
 * Responsibilities:
 * - Convert approved intent + design + rules into code-ready build prompts
 * - Generate prompts for execution agents (does NOT write code itself)
 * - Ensure each prompt is atomic, scoped, and references project rules
 * - Maintain deterministic build order
 * - Transition Conductor from rules_locked → building
 *
 * HARD CONSTRAINTS:
 * - Cannot start unless Conductor = rules_locked
 * - Does NOT write production code
 * - Only generates Markdown instructions
 * - One prompt = one atomic build task
 * - All prompts must reference project rules explicitly
 * - Human approval required for each prompt
 * - Lock/unlock discipline required
 * - Full event emission for observability
 */

import type { PrismaClient, BuildPrompt } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';

const PromptStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

type PromptStatusValue = (typeof PromptStatus)[keyof typeof PromptStatus];

export interface BuildPromptData {
  id: string;
  appRequestId: string;
  title: string;
  content: string;
  sequenceIndex: number;
  status: PromptStatusValue;
  feedback: string | null;
  allowedCreateFiles: string[];
  allowedModifyFiles: string[];
  forbiddenFiles: string[];
  fullRewriteFiles: string[];
  dependencyManifest: Record<string, any>;
  modificationIntent: Record<string, any>;
  createdAt: Date;
  approvedAt: Date | null;
}

export interface EngineerState {
  totalPrompts: number;
  currentPrompt: BuildPromptData | null;
  completedCount: number;
  remainingCount: number;
}

interface LLMConfig {
  apiKey: string;
  model: string;
}

/**
 * Execution Contract - what an execution agent is allowed/forbidden to do
 */
export interface ExecutionContract {
  allowedCreateFiles: string[];
  allowedModifyFiles: string[];
  forbiddenFiles: string[];
  fullRewriteFiles: string[];
  dependencyManifest: DependencyManifest;
  modificationIntent: ModificationIntent;
}

/**
 * Dependency Manifest
 */
export interface DependencyManifest {
  newDependencies: Record<string, string>; // package: version
  devDependencies: Record<string, string>; // package: version
  rationale: string[];
}

/**
 * Modification Intent - what each file change should accomplish
 */
export interface ModificationIntent {
  [filePath: string]: {
    intent: string;
    constraints: string[];
  };
}

/**
 * Build Ledger - track what's been committed in previous prompts
 */
interface BuildLedger {
  filesCreated: Set<string>;
  filesModified: Set<string>;
  filesFullRewrite: Set<string>;
  dependenciesAdded: Set<string>;
}

/**
 * Build phase definitions (deterministic order)
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

/**
 * Files that are ALWAYS forbidden from modification
 */
const ALWAYS_FORBIDDEN_FILES = [
  'prisma/schema.prisma',
  'prisma/migrations/**/*',
  'src/conductor/**/*',
  'src/agents/verification-agent.ts',
  'docs/PROJECT_RULES.md',
];

export class BuildPromptEngineer {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private llmConfig: LLMConfig;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;

    this.llmConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.LLM_MODEL || 'gpt-4o',
    };

    this.logger.info('BuildPromptEngineer initialized');
  }

  async start(appRequestId: string): Promise<BuildPromptData> {
    this.logger.info({ appRequestId }, 'Starting Build Prompt Engineer');

    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'rules_locked') {
      throw new Error(
        `Cannot start Build Prompt Engineer: Conductor state is '${state.currentStatus}', expected 'rules_locked'`
      );
    }

    await this.conductor.lock(appRequestId);

    try {
      const context = await this.loadContext(appRequestId);
      const ledger = await this.buildLedgerFromPreviousPrompts(appRequestId);

      // Generate execution contract
      const contract = await this.generateExecutionContract('scaffolding', context, 0, ledger);
      this.validateExecutionContract(contract);

      // Generate prompt content with contract sections
      const promptContent = await this.generatePromptForPhase(appRequestId, 'scaffolding', context, 0, contract);

      const prompt = await this.prisma.buildPrompt.create({
        data: {
          id: randomUUID(),
          appRequestId,
          title: 'Project Scaffolding & Setup',
          content: promptContent,
          sequenceIndex: 0,
          status: PromptStatus.AWAITING_APPROVAL,
          allowedCreateFiles: JSON.stringify(contract.allowedCreateFiles),
          allowedModifyFiles: JSON.stringify(contract.allowedModifyFiles),
          forbiddenFiles: JSON.stringify(contract.forbiddenFiles),
          fullRewriteFiles: JSON.stringify(contract.fullRewriteFiles),
          dependencyManifest: JSON.stringify(contract.dependencyManifest),
          modificationIntent: JSON.stringify(contract.modificationIntent),
        },
      });

      await this.emitEvent(appRequestId, 'build_prompt_created', `Build prompt created: ${prompt.title}`);
      await this.conductor.pauseForHuman(appRequestId, `Build prompt generated - awaiting approval`);
      await this.conductor.unlock(appRequestId);

      return this.toPromptData(prompt);
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      throw error;
    }
  }

  async approveCurrentPrompt(appRequestId: string): Promise<BuildPromptData> {
    this.logger.info({ appRequestId }, 'Approving current build prompt');

    const prompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: PromptStatus.AWAITING_APPROVAL },
      orderBy: { sequenceIndex: 'desc' },
    });

    if (!prompt) {
      throw new Error(`No build prompt awaiting approval`);
    }

    const approved = await this.prisma.buildPrompt.update({
      where: { id: prompt.id },
      data: { status: PromptStatus.APPROVED, approvedAt: new Date() },
    });

    await this.emitEvent(appRequestId, 'build_prompt_approved', `Build prompt approved: ${approved.title}`);
    await this.conductor.resumeAfterHuman(appRequestId);

    // Check if all prompts complete
    const context = await this.loadContext(appRequestId);
    const nextOrder = approved.sequenceIndex + 1;
    const totalNeeded = this.calculateTotalPrompts(context);

    if (nextOrder >= totalNeeded) {
      await this.conductor.transition(appRequestId, 'build_prompts_ready', 'BuildPromptEngineer');
      await this.emitEvent(appRequestId, 'build_prompts_ready', 'All build prompts approved - ready for execution');
    }

    return this.toPromptData(approved);
  }

  async generateNextPrompt(appRequestId: string): Promise<BuildPromptData> {
    const approved = await this.prisma.buildPrompt.findMany({
      where: { appRequestId, status: PromptStatus.APPROVED },
      orderBy: { sequenceIndex: 'asc' },
    });

    const nextOrder = approved.length;
    const context = await this.loadContext(appRequestId);

    await this.conductor.lock(appRequestId);

    try {
      const ledger = await this.buildLedgerFromPreviousPrompts(appRequestId);
      const phase = this.determinePhase(nextOrder, context);

      // Generate execution contract
      const contract = await this.generateExecutionContract(phase, context, nextOrder, ledger);
      this.validateExecutionContract(contract);

      // Generate prompt content with contract sections
      const promptContent = await this.generatePromptForPhase(appRequestId, phase, context, nextOrder, contract);
      const title = this.getPhaseTitle(phase, nextOrder, context);

      const prompt = await this.prisma.buildPrompt.create({
        data: {
          id: randomUUID(),
          appRequestId,
          title,
          content: promptContent,
          sequenceIndex: nextOrder,
          status: PromptStatus.AWAITING_APPROVAL,
          allowedCreateFiles: JSON.stringify(contract.allowedCreateFiles),
          allowedModifyFiles: JSON.stringify(contract.allowedModifyFiles),
          forbiddenFiles: JSON.stringify(contract.forbiddenFiles),
          fullRewriteFiles: JSON.stringify(contract.fullRewriteFiles),
          dependencyManifest: JSON.stringify(contract.dependencyManifest),
          modificationIntent: JSON.stringify(contract.modificationIntent),
        },
      });

      await this.emitEvent(appRequestId, 'build_prompt_created', `Build prompt created: ${prompt.title}`);
      await this.conductor.pauseForHuman(appRequestId, `Build prompt generated - awaiting approval`);
      await this.conductor.unlock(appRequestId);

      return this.toPromptData(prompt);
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      throw error;
    }
  }

  async rejectCurrentPrompt(appRequestId: string, feedback?: string): Promise<void> {
    const prompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: PromptStatus.AWAITING_APPROVAL },
      orderBy: { sequenceIndex: 'desc' },
    });

    if (!prompt) {
      throw new Error(`No build prompt awaiting approval`);
    }

    await this.prisma.buildPrompt.delete({ where: { id: prompt.id } });
    await this.emitEvent(
      appRequestId,
      'build_prompt_rejected',
      `Build prompt rejected: ${prompt.title}${feedback ? `: ${feedback}` : ''}`
    );
    await this.conductor.unlock(appRequestId);
  }

  async getCurrentState(appRequestId: string): Promise<EngineerState> {
    const context = await this.loadContext(appRequestId);
    const totalPrompts = this.calculateTotalPrompts(context);

    const currentPrompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: PromptStatus.AWAITING_APPROVAL },
    });

    const completedCount = await this.prisma.buildPrompt.count({
      where: { appRequestId, status: PromptStatus.APPROVED },
    });

    return {
      totalPrompts,
      currentPrompt: currentPrompt ? this.toPromptData(currentPrompt) : null,
      completedCount,
      remainingCount: totalPrompts - completedCount - (currentPrompt ? 1 : 0),
    };
  }

  private async loadContext(appRequestId: string) {
    const rules = await this.prisma.projectRuleSet.findUnique({ where: { appRequestId } });
    const screenIndex = await this.prisma.screenIndex.findUnique({ where: { appRequestId } });
    const screens: string[] = screenIndex ? JSON.parse(screenIndex.screens) : [];

    return { rules: rules?.content || '', screens, appRequestId };
  }

  private calculateTotalPrompts(context: { screens: string[] }): number {
    return 3 + context.screens.length + 3; // scaffolding + arch + auth + screens + logic + integrations + polish
  }

  private determinePhase(sequenceIndex: number, context: { screens: string[] }): string {
    if (sequenceIndex === 0) return 'scaffolding';
    if (sequenceIndex === 1) return 'architecture';
    if (sequenceIndex === 2) return 'auth';
    if (sequenceIndex < 3 + context.screens.length) return 'ui_screens';
    if (sequenceIndex === 3 + context.screens.length) return 'logic';
    if (sequenceIndex === 4 + context.screens.length) return 'integrations';
    return 'polish';
  }

  private getPhaseTitle(phase: string, sequenceIndex: number, context: { screens: string[] }): string {
    if (phase === 'scaffolding') return 'Project Scaffolding & Setup';
    if (phase === 'architecture') return 'Core Architecture & Database';
    if (phase === 'auth') return 'Authentication & Role System';
    if (phase === 'ui_screens') {
      const screenIndex = sequenceIndex - 3;
      return `UI Implementation: ${context.screens[screenIndex]}`;
    }
    if (phase === 'logic') return 'Business Logic & Services';
    if (phase === 'integrations') return 'Integrations & APIs';
    return 'Final Polish & Optimization';
  }

  private async generatePromptForPhase(
    appRequestId: string,
    phase: string,
    context: { rules: string; screens: string[]; appRequestId: string },
    sequenceIndex: number,
    contract: ExecutionContract
  ): Promise<string> {
    if (!this.llmConfig.apiKey) {
      return this.generateFallbackPrompt(phase, context, sequenceIndex, contract);
    }

    // LLM generation would go here
    return this.generateFallbackPrompt(phase, context, sequenceIndex, contract);
  }

  private generateFallbackPrompt(
    phase: string,
    context: { rules: string; screens: string[] },
    sequenceIndex: number,
    contract: ExecutionContract
  ): string {
    const contractMarkdown = this.formatExecutionContractAsMarkdown(contract);

    return `# Build Prompt: ${this.getPhaseTitle(phase, sequenceIndex, context)}

## Purpose
Implement ${phase} phase of the application.

## Scope (STRICT)
- Implement only what is defined in project rules
- Do NOT invent features
- Do NOT modify approved designs
- ONLY touch files explicitly listed in "Allowed File Operations" below

${contractMarkdown}

## Inputs (Authoritative)
- Project Rules (MANDATORY - see below)
- Approved Screens
- Approved Mockups
- Execution Contract (above)

## Required Outputs
- Code files as specified in contract
- Passing tests

## Implementation Constraints
- Follow project rules exactly
- Use approved tech stack
- Maintain folder structure
- Respect all forbidden files
- Install only declared dependencies

## Verification Requirements
- All code must pass Phase 10 verification
- No errors allowed
- All files must match contract

## Git & Logging
- Commit with descriptive message
- Update project_log.md

## Stop Conditions
- If requirements conflict, STOP
- If rules unclear, STOP
- If scope exceeded, STOP
- If file not in contract, STOP

## Project Rules (BINDING)

${context.rules}`;
  }

  private async emitEvent(appRequestId: string, type: string, message: string): Promise<void> {
    const appRequest = await this.prisma.appRequest.findUnique({ where: { id: appRequestId } });
    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: { id: randomUUID(), executionId: appRequest.executionId, type, message },
      });
    }
  }

  /**
   * Build ledger from all previously approved prompts
   * This prevents file ownership conflicts and dependency duplication
   */
  private async buildLedgerFromPreviousPrompts(appRequestId: string): Promise<BuildLedger> {
    const approvedPrompts = await this.prisma.buildPrompt.findMany({
      where: { appRequestId, status: PromptStatus.APPROVED },
      orderBy: { sequenceIndex: 'asc' },
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
      const manifest = JSON.parse(prompt.dependencyManifest) as DependencyManifest;

      createFiles.forEach((f) => ledger.filesCreated.add(f));
      modifyFiles.forEach((f) => ledger.filesModified.add(f));
      rewriteFiles.forEach((f) => ledger.filesFullRewrite.add(f));

      Object.keys(manifest.newDependencies || {}).forEach((d) => ledger.dependenciesAdded.add(d));
      Object.keys(manifest.devDependencies || {}).forEach((d) => ledger.dependenciesAdded.add(d));
    }

    return ledger;
  }

  /**
   * Generate execution contract for a specific phase
   * This determines what files can be touched and what dependencies are needed
   */
  private async generateExecutionContract(
    phase: string,
    context: { screens: string[]; rules: string },
    sequenceIndex: number,
    ledger: BuildLedger
  ): Promise<ExecutionContract> {
    // Default contract structure
    const contract: ExecutionContract = {
      allowedCreateFiles: [],
      allowedModifyFiles: [],
      forbiddenFiles: [...ALWAYS_FORBIDDEN_FILES],
      fullRewriteFiles: [],
      dependencyManifest: {
        newDependencies: {},
        devDependencies: {},
        rationale: [],
      },
      modificationIntent: {},
    };

    // Phase-specific file operations
    switch (phase) {
      case 'scaffolding':
        contract.allowedCreateFiles = [
          'package.json',
          'tsconfig.json',
          '.gitignore',
          'README.md',
          'src/index.ts',
          'src/types.ts',
        ];
        contract.dependencyManifest.newDependencies = {
          'express': '^4.18.2',
          'dotenv': '^16.0.3',
        };
        contract.dependencyManifest.devDependencies = {
          'typescript': '^5.0.0',
          '@types/node': '^20.0.0',
          '@types/express': '^4.17.17',
        };
        contract.dependencyManifest.rationale = [
          'express: Web server framework',
          'dotenv: Environment variable management',
          'typescript: Type-safe development',
        ];
        break;

      case 'architecture':
        contract.allowedCreateFiles = [
          'src/db/connection.ts',
          'src/middleware/error-handler.ts',
          'src/utils/logger.ts',
        ];
        break;

      case 'auth':
        contract.allowedCreateFiles = [
          'src/auth/auth-service.ts',
          'src/auth/jwt-utils.ts',
          'src/middleware/auth-middleware.ts',
        ];
        contract.dependencyManifest.newDependencies = {
          'jsonwebtoken': '^9.0.0',
          'bcrypt': '^5.1.0',
        };
        contract.dependencyManifest.rationale = [
          'jsonwebtoken: JWT token generation/validation',
          'bcrypt: Password hashing',
        ];
        break;

      case 'ui_screens':
        const screenIndex = sequenceIndex - 3;
        const screenName = context.screens[screenIndex];
        contract.allowedCreateFiles = [
          `src/screens/${screenName}.tsx`,
          `src/screens/${screenName}.module.css`,
        ];
        break;

      case 'logic':
        contract.allowedCreateFiles = ['src/services/business-logic.ts'];
        contract.allowedModifyFiles = ['src/index.ts'];
        break;

      case 'integrations':
        contract.allowedCreateFiles = ['src/integrations/api-client.ts'];
        break;

      case 'polish':
        contract.allowedModifyFiles = ['README.md', 'package.json'];
        break;
    }

    // Remove dependencies that already exist in ledger
    Object.keys(contract.dependencyManifest.newDependencies).forEach((dep) => {
      if (ledger.dependenciesAdded.has(dep)) {
        delete contract.dependencyManifest.newDependencies[dep];
      }
    });

    // Check for file ownership conflicts
    for (const file of contract.allowedCreateFiles) {
      if (ledger.filesCreated.has(file)) {
        throw new Error(
          `File ownership conflict: ${file} already created in previous prompt`
        );
      }
    }

    // Generate modification intent for each file
    [...contract.allowedCreateFiles, ...contract.allowedModifyFiles, ...contract.fullRewriteFiles].forEach((file) => {
      contract.modificationIntent[file] = {
        intent: `Implement ${phase} phase requirements for ${file}`,
        constraints: ['Follow project rules', 'Maintain existing API contracts'],
      };
    });

    return contract;
  }

  /**
   * Validate execution contract
   * Ensures contract is complete and doesn't violate rules
   */
  private validateExecutionContract(contract: ExecutionContract): void {
    // Check for overlaps between allowed and forbidden
    const allAllowed = [
      ...contract.allowedCreateFiles,
      ...contract.allowedModifyFiles,
      ...contract.fullRewriteFiles,
    ];

    for (const file of allAllowed) {
      for (const forbidden of contract.forbiddenFiles) {
        if (file.match(forbidden.replace('**/*', '.*'))) {
          throw new Error(`Contract violation: ${file} appears in both allowed and forbidden lists`);
        }
      }
    }

    // Ensure all paths are relative
    for (const file of allAllowed) {
      if (file.startsWith('/') || file.includes('..')) {
        throw new Error(`Invalid file path: ${file} must be relative and inside project root`);
      }
    }

    // Check that dependency manifest has rationale if dependencies exist
    const hasDeps =
      Object.keys(contract.dependencyManifest.newDependencies).length > 0 ||
      Object.keys(contract.dependencyManifest.devDependencies).length > 0;

    if (hasDeps && contract.dependencyManifest.rationale.length === 0) {
      throw new Error('Dependencies declared but no rationale provided');
    }

    // Ensure modification intent exists for all files
    for (const file of allAllowed) {
      if (!contract.modificationIntent[file]) {
        throw new Error(`Missing modification intent for ${file}`);
      }
    }
  }

  /**
   * Format execution contract as Markdown sections
   */
  private formatExecutionContractAsMarkdown(contract: ExecutionContract): string {
    let markdown = '\n## Allowed File Operations\n\n';

    markdown += '### Files to CREATE\n';
    if (contract.allowedCreateFiles.length > 0) {
      contract.allowedCreateFiles.forEach((f) => (markdown += `- ${f}\n`));
    } else {
      markdown += '- (none)\n';
    }

    markdown += '\n### Files to MODIFY (PATCH ONLY)\n';
    if (contract.allowedModifyFiles.length > 0) {
      contract.allowedModifyFiles.forEach((f) => (markdown += `- ${f}\n`));
    } else {
      markdown += '- (none)\n';
    }

    markdown += '\n### Files to MODIFY (FULL REWRITE)\n';
    if (contract.fullRewriteFiles.length > 0) {
      contract.fullRewriteFiles.forEach((f) => (markdown += `- ${f}\n`));
    } else {
      markdown += '- (none)\n';
    }

    markdown += '\n### Files FORBIDDEN to Touch\n';
    contract.forbiddenFiles.forEach((f) => (markdown += `- ${f}\n`));

    markdown += '\n## Dependency Changes\n\n';

    markdown += '### New Dependencies\n';
    const newDeps = Object.entries(contract.dependencyManifest.newDependencies);
    if (newDeps.length > 0) {
      newDeps.forEach(([pkg, ver]) => (markdown += `- ${pkg}@${ver}\n`));
    } else {
      markdown += '- (none)\n';
    }

    markdown += '\n### Dev Dependencies\n';
    const devDeps = Object.entries(contract.dependencyManifest.devDependencies);
    if (devDeps.length > 0) {
      devDeps.forEach(([pkg, ver]) => (markdown += `- ${pkg}@${ver}\n`));
    } else {
      markdown += '- (none)\n';
    }

    markdown += '\n### Rationale\n';
    if (contract.dependencyManifest.rationale.length > 0) {
      contract.dependencyManifest.rationale.forEach((r) => (markdown += `- ${r}\n`));
    } else {
      markdown += '- (none)\n';
    }

    markdown += '\n## Modification Intent\n\n';
    Object.entries(contract.modificationIntent).forEach(([file, { intent, constraints }]) => {
      markdown += `**${file}**\n`;
      markdown += `- Intent: ${intent}\n`;
      markdown += `- Constraints:\n`;
      constraints.forEach((c) => (markdown += `  - ${c}\n`));
      markdown += '\n';
    });

    return markdown;
  }

  private toPromptData(prompt: BuildPrompt): BuildPromptData {
    return {
      id: prompt.id,
      appRequestId: prompt.appRequestId,
      title: prompt.title,
      content: prompt.content,
      sequenceIndex: prompt.sequenceIndex,
      status: prompt.status as PromptStatusValue,
      feedback: prompt.feedback,
      allowedCreateFiles: JSON.parse(prompt.allowedCreateFiles),
      allowedModifyFiles: JSON.parse(prompt.allowedModifyFiles),
      forbiddenFiles: JSON.parse(prompt.forbiddenFiles),
      fullRewriteFiles: JSON.parse(prompt.fullRewriteFiles),
      dependencyManifest: JSON.parse(prompt.dependencyManifest),
      modificationIntent: JSON.parse(prompt.modificationIntent),
      createdAt: prompt.createdAt,
      approvedAt: prompt.approvedAt,
    };
  }
}
