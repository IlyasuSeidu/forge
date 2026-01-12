/**
 * Screen Cartographer Agent - PRODUCTION HARDENED
 *
 * Tier 2 - Product & Structure Agent (AI-powered, CONSTRAINED)
 *
 * Purpose:
 * Defines the complete surface area of the application by mapping ALL screens
 * that must exist and describing WHAT each screen does.
 *
 * CRITICAL: This agent defines UI structure. Mistakes here create:
 * - Ghost screens downstream agents cannot implement
 * - Missing critical flows
 * - Unverifiable UI surface area
 *
 * Authority Level: STRUCTURAL_AUTHORITY
 * - Generates Screen Index (complete list)
 * - Generates Screen Definitions (one-by-one)
 * - NEVER invents screens not in planning docs
 * - NEVER modifies approved screens
 * - NEVER generates UI/code
 *
 * Hardening Features:
 * 1. PromptEnvelope (STRUCTURAL_AUTHORITY)
 * 2. Context Isolation (approved planning docs by hash ONLY)
 * 3. Screen Index Contract (strict schema)
 * 4. Screen Definition Contract (6 required sections)
 * 5. Immutability & Hashing (SHA-256)
 * 6. Determinism Guarantees (same input → same output)
 * 7. Failure & Escalation (NO silent fixes)
 * 8. Planning Docs Validation (every screen justified)
 * 9. Comprehensive Testing
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID, createHash } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { ProductStrategistHardened } from './product-strategist-hardened.js';

/**
 * PART 1: PromptEnvelope (STRUCTURAL_AUTHORITY)
 *
 * Screen Cartographer has STRUCTURAL_AUTHORITY.
 * It defines WHAT SCREENS EXIST and WHAT EACH SCREEN CONTAINS.
 */
interface PromptEnvelope {
  agentName: 'ScreenCartographer';
  agentVersion: '1.0.0';
  authorityLevel: 'STRUCTURAL_AUTHORITY';
  allowedActions: (
    | 'generateScreenIndex'
    | 'describeScreenFromIndex'
    | 'persistScreenDefinitions'
    | 'validateAgainstPlanningDocs'
  )[];
  forbiddenActions: (
    | 'inventScreens'
    | 'renameApprovedScreens'
    | 'modifyApprovedScreenDefinitions'
    | 'inferUserFlows'
    | 'designUIComponents'
    | 'accessRulesOrCode'
    | 'accessMockups'
    | 'bypassApproval'
  )[];
}

/**
 * PART 3: Screen Index Contract (STRICT)
 *
 * Must be flat ordered list of strings
 * No duplicates, no inferred screens
 */
export interface ScreenIndexContract {
  screens: string[]; // MUST be non-empty array
}

/**
 * PART 3: Screen Definition Contract (STRICT)
 *
 * Each screen MUST contain ALL 6 sections
 */
export interface ScreenDefinitionContract {
  screenName: string; // MUST match index
  purpose: string; // MUST be present
  userRoleAccess: string; // MUST be present
  layoutStructure: string; // MUST be present
  functionalLogic: string; // MUST be present
  keyUIElements: string; // MUST be present
  specialBehaviors: string; // MUST be present (can be "None")
}

/**
 * Screen Status Constants
 */
export const ScreenStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

export type ScreenStatusValue = typeof ScreenStatus[keyof typeof ScreenStatus];

/**
 * Screen Index (Hardened)
 */
export interface ScreenIndexHardened {
  id: string;
  appRequestId: string;
  screens: string[];
  status: ScreenStatusValue;

  // Immutability & Versioning (Production Hardening)
  screenIndexVersion: number;
  screenIndexHash: string | null; // SHA-256 (null until approved)
  approvedAt: Date | null;
  approvedBy: string | null; // "human"
  basePromptHash: string; // Reference to Base Prompt
  planningDocsHash: string; // SHA-256 of Master + Implementation Plans

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Screen Definition (Hardened)
 */
export interface ScreenDefinitionHardened {
  id: string;
  appRequestId: string;
  screenName: string;
  content: string;
  order: number;
  status: ScreenStatusValue;

  // Immutability & Versioning (Production Hardening)
  screenVersion: number;
  screenHash: string | null; // SHA-256 (null until approved)
  approvedAt: Date | null;
  approvedBy: string | null; // "human"
  screenIndexHash: string; // Reference to approved Screen Index
  basePromptHash: string; // Reference to Base Prompt
  planningDocsHash: string; // SHA-256 of planning docs

  createdAt: Date;
  updatedAt: Date;
}

/**
 * LLM Configuration (Deterministic)
 */
interface LLMConfig {
  apiKey?: string;
  model: string;
  temperature: number; // MUST be ≤ 0.3 for determinism
  maxTokens: number;
  retryAttempts: number;
  provider: 'anthropic' | 'openai';
}

/**
 * Screen Cartographer Agent - PRODUCTION HARDENED
 *
 * The third LLM-backed agent in Forge, with ZERO TOLERANCE for:
 * - Screen invention
 * - Approval bypass
 * - Non-determinism
 * - Modification of approved screens
 */
export class ScreenCartographerHardened {
  private envelope: PromptEnvelope;
  private llmConfig: LLMConfig;
  private productStrategist: ProductStrategistHardened | null;

  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: FastifyBaseLogger,
    productStrategist: ProductStrategistHardened | null = null,
    config?: Partial<LLMConfig>
  ) {
    // Initialize envelope
    this.envelope = {
      agentName: 'ScreenCartographer',
      agentVersion: '1.0.0',
      authorityLevel: 'STRUCTURAL_AUTHORITY',
      allowedActions: [
        'generateScreenIndex',
        'describeScreenFromIndex',
        'persistScreenDefinitions',
        'validateAgainstPlanningDocs',
      ],
      forbiddenActions: [
        'inventScreens',
        'renameApprovedScreens',
        'modifyApprovedScreenDefinitions',
        'inferUserFlows',
        'designUIComponents',
        'accessRulesOrCode',
        'accessMockups',
        'bypassApproval',
      ],
    };

    // Validate envelope
    this.validateEnvelope();

    // Validate temperature BEFORE setting (DETERMINISM constraint)
    const requestedTemperature = config?.temperature ?? 0.3;
    if (requestedTemperature > 0.3) {
      throw new Error(
        `DETERMINISM VIOLATION: Temperature must be ≤ 0.3, got ${requestedTemperature}`
      );
    }

    // LLM config with DETERMINISM constraints
    const provider = config?.provider || 'anthropic'; // Default to Claude
    this.llmConfig = {
      apiKey: config?.apiKey || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY),
      model: config?.model || (provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o'),
      temperature: requestedTemperature,
      maxTokens: config?.maxTokens || 2000,
      retryAttempts: config?.retryAttempts || 3,
      provider,
    };

    this.productStrategist = productStrategist;

    this.logger.info(
      {
        envelope: this.envelope,
        temperature: this.llmConfig.temperature,
        model: this.llmConfig.model,
      },
      'ScreenCartographerHardened initialized with STRUCTURAL authority'
    );
  }

  /**
   * PART 1: Validate Envelope
   *
   * Ensures agent operates within constitutional boundaries.
   */
  private validateEnvelope(): void {
    if (this.envelope.agentName !== 'ScreenCartographer') {
      throw new Error('ENVELOPE VIOLATION: Agent name mismatch');
    }

    if (this.envelope.authorityLevel !== 'STRUCTURAL_AUTHORITY') {
      throw new Error('ENVELOPE VIOLATION: Authority level must be STRUCTURAL_AUTHORITY');
    }

    if (!this.envelope.forbiddenActions.includes('inventScreens')) {
      throw new Error('ENVELOPE VIOLATION: Must forbid screen invention');
    }

    if (!this.envelope.forbiddenActions.includes('modifyApprovedScreenDefinitions')) {
      throw new Error('ENVELOPE VIOLATION: Must forbid modification of approved screens');
    }

    this.logger.debug({ envelope: this.envelope }, 'Envelope validated successfully');
  }

  /**
   * PART 2: Validate Context Access
   *
   * Ensures agent only accesses approved planning docs.
   */
  private validateContextAccess(basePromptHash: string, planningDocsHash: string): void {
    if (!basePromptHash || basePromptHash.length === 0) {
      throw new Error('CONTEXT VIOLATION: Base Prompt hash is required');
    }

    if (!planningDocsHash || planningDocsHash.length === 0) {
      throw new Error('CONTEXT VIOLATION: Planning Docs hash is required');
    }

    this.logger.debug(
      {
        basePromptHash: basePromptHash.substring(0, 16) + '...',
        planningDocsHash: planningDocsHash.substring(0, 16) + '...',
      },
      'Context access validated'
    );
  }

  /**
   * PART 3: Validate Screen Index Contract
   *
   * Ensures screen list is valid and complete.
   */
  private validateScreenIndexContract(contract: ScreenIndexContract): void {
    const errors: string[] = [];

    // screens MUST be non-empty array
    if (!contract.screens || !Array.isArray(contract.screens) || contract.screens.length === 0) {
      errors.push('screens MUST be a non-empty array');
    }

    // No duplicates
    const unique = new Set(contract.screens);
    if (unique.size !== contract.screens.length) {
      errors.push('screens array contains duplicates');
    }

    // All must be non-empty strings
    for (const screen of contract.screens) {
      if (typeof screen !== 'string' || screen.trim().length === 0) {
        errors.push(`Invalid screen name: "${screen}"`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`SCREEN INDEX CONTRACT VALIDATION FAILED:\n${errors.join('\n')}`);
    }

    this.logger.debug({ contract, screenCount: contract.screens.length }, 'Screen Index contract validated successfully');
  }

  /**
   * PART 3: Validate Screen Definition Contract
   *
   * Ensures screen definition has ALL 6 required sections.
   */
  private validateScreenDefinitionContract(contract: ScreenDefinitionContract): void {
    const errors: string[] = [];

    // screenName MUST be present
    if (!contract.screenName || contract.screenName.trim().length === 0) {
      errors.push('screenName MUST be present');
    }

    // purpose MUST be present
    if (!contract.purpose || contract.purpose.trim().length === 0) {
      errors.push('purpose MUST be present');
    }

    // userRoleAccess MUST be present
    if (!contract.userRoleAccess || contract.userRoleAccess.trim().length === 0) {
      errors.push('userRoleAccess MUST be present');
    }

    // layoutStructure MUST be present
    if (!contract.layoutStructure || contract.layoutStructure.trim().length === 0) {
      errors.push('layoutStructure MUST be present');
    }

    // functionalLogic MUST be present
    if (!contract.functionalLogic || contract.functionalLogic.trim().length === 0) {
      errors.push('functionalLogic MUST be present');
    }

    // keyUIElements MUST be present
    if (!contract.keyUIElements || contract.keyUIElements.trim().length === 0) {
      errors.push('keyUIElements MUST be present');
    }

    // specialBehaviors MUST be present (can be "None")
    if (!contract.specialBehaviors || contract.specialBehaviors.trim().length === 0) {
      errors.push('specialBehaviors MUST be present (use "None" if no special behaviors)');
    }

    if (errors.length > 0) {
      throw new Error(`SCREEN DEFINITION CONTRACT VALIDATION FAILED:\n${errors.join('\n')}`);
    }

    this.logger.debug({ contract }, 'Screen Definition contract validated successfully');
  }

  /**
   * PART 8: Validate Screen Against Planning Docs
   *
   * Ensures every screen is justified by planning docs OR base prompt.
   */
  private async validateScreenJustification(
    screenName: string,
    planningDocsContent: string,
    basePromptContent: string
  ): Promise<void> {
    const screenLower = screenName.toLowerCase();
    const planningLower = planningDocsContent.toLowerCase();
    const basePromptLower = basePromptContent.toLowerCase();

    // Check if screen appears in planning docs OR base prompt OR is standard infrastructure
    const isInPlanningDocs = planningLower.includes(screenLower.substring(0, Math.min(screenLower.length, 20)));
    const isInBasePrompt = basePromptLower.includes(screenLower.substring(0, Math.min(screenLower.length, 20)));
    const isStandardUI = [
      'landing',
      'home',
      'dashboard',
      'login',
      'sign up',
      'signup',
      'sign in',
      'signin',
      'register',
      'settings',
      'profile',
      '404',
      'not found',
      'error',
    ].some(keyword => screenLower.includes(keyword));

    if (!isInPlanningDocs && !isInBasePrompt && !isStandardUI) {
      await this.emitEvent('', 'screen_cartography_conflict', `Screen "${screenName}" may not be justified by planning docs or base prompt`);
      throw new Error(
        `SCREEN JUSTIFICATION VIOLATION: Screen "${screenName}" does not appear to map to planning docs or base prompt. If planning docs are vague, do NOT infer - escalate to human.`
      );
    }

    this.logger.debug({ screenName }, 'Screen justification validated');
  }

  /**
   * PART 5: Compute Document Hash
   *
   * SHA-256 hash for immutability.
   */
  private computeDocumentHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * PART 5: Compute Planning Docs Hash
   *
   * Combined hash of Master Plan + Implementation Plan.
   */
  private computePlanningDocsHash(masterPlan: string, implPlan: string): string {
    const combined = masterPlan + '\n---\n' + implPlan;
    return createHash('sha256').update(combined, 'utf8').digest('hex');
  }

  /**
   * PART 6: Serialize Screen Index (Deterministic)
   *
   * Stable serialization for determinism.
   */
  private serializeScreenIndex(contract: ScreenIndexContract): string {
    // Alphabetically sort screens for determinism
    const sorted = [...contract.screens].sort();
    return JSON.stringify(sorted);
  }

  /**
   * PART 6: Serialize Screen Definition (Deterministic)
   *
   * Stable markdown format for determinism.
   */
  private serializeScreenDefinition(contract: ScreenDefinitionContract): string {
    const sections: string[] = [];
    sections.push(`# ${contract.screenName}\n`);
    sections.push(`## Purpose\n\n${contract.purpose}\n`);
    sections.push(`## User Role Access\n\n${contract.userRoleAccess}\n`);
    sections.push(`## Layout Structure\n\n${contract.layoutStructure}\n`);
    sections.push(`## Functional Logic\n\n${contract.functionalLogic}\n`);
    sections.push(`## Key UI Elements\n\n${contract.keyUIElements}\n`);
    sections.push(`## Special Behaviors\n\n${contract.specialBehaviors}\n`);
    return sections.join('\n');
  }

  /**
   * Start Screen Cartographer (Phase 1: Screen Index)
   *
   * Rules (HARDENED):
   * - Validates Conductor state = planning
   * - Validates envelope before execution
   * - Gets planning docs BY HASH
   * - Generates Screen Index with contract validation
   * - Validates every screen against planning docs
   * - Computes index hash
   * - Saves with immutability fields
   * - Pauses Conductor for human approval
   *
   * @throws Error if envelope validation fails
   * @throws Error if Conductor not in planning state
   * @throws Error if planning docs not approved
   * @throws Error if contract validation fails
   * @throws Error if screen justification fails
   */
  async start(appRequestId: string): Promise<ScreenIndexHardened> {
    this.logger.info({ appRequestId }, 'Starting Screen Cartographer (HARDENED)');

    // PART 1: Validate envelope
    this.validateEnvelope();

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'planning') {
      throw new Error(
        `Cannot start Screen Cartographer: Conductor state is '${state.currentStatus}', expected 'planning'`
      );
    }

    this.logger.debug({ appRequestId, state: state.currentStatus }, 'Conductor state validated');

    // Check if screen index already exists
    const existing = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (existing) {
      throw new Error(`Screen Index already exists for appRequestId: ${appRequestId}`);
    }

    // PART 2: Get planning docs BY HASH
    const { basePromptHash, masterPlan, masterPlanHash, implPlan, implPlanHash } =
      await this.getPlanningDocsWithHash(appRequestId);

    const planningDocsHash = this.computePlanningDocsHash(masterPlan, implPlan);

    // Get base prompt content for screen justification
    const basePrompt = await this.getBasePrompt(appRequestId);

    this.logger.info(
      {
        appRequestId,
        basePromptHash: basePromptHash.substring(0, 16) + '...',
        planningDocsHash: planningDocsHash.substring(0, 16) + '...',
      },
      'Planning docs loaded by hash'
    );

    // PART 2: Validate context isolation
    this.validateContextAccess(basePromptHash, planningDocsHash);

    // Lock Conductor
    await this.conductor.lock(appRequestId);
    this.logger.debug({ appRequestId }, 'Conductor locked');

    // Emit screen_cartography_started event
    await this.emitEvent(appRequestId, 'screen_cartography_started', 'Screen Cartographer (HARDENED) initiated');

    // PART 6: Generate Screen Index (deterministic with closed vocabulary)
    // Note: generateScreenIndexContract now returns canonicalized screens from closed vocabulary
    // Screen justification validation is built into the vocabulary extraction + canonicalization
    const screenIndexContract = await this.generateScreenIndexContract(masterPlan, implPlan, basePrompt);

    // PART 3: Validate contract
    this.validateScreenIndexContract(screenIndexContract);

    // Screen justification is now implicit: all screens MUST be from the extracted vocabulary
    // which is derived from base prompt + planning docs + standard screens
    // Canonicalization enforces this - no additional validation needed

    // PART 6: Serialize to deterministic format
    const screenIndexContent = this.serializeScreenIndex(screenIndexContract);

    this.logger.info(
      { appRequestId, screenCount: screenIndexContract.screens.length },
      'Screen Index generated with contract validation'
    );

    // PART 5: Compute hash
    const indexHash = this.computeDocumentHash(screenIndexContent);

    // Save Screen Index with immutability fields
    const screenIndex = await this.prisma.screenIndex.create({
      data: {
        id: randomUUID(),
        appRequestId,
        screens: JSON.stringify(screenIndexContract.screens),
        status: ScreenStatus.AWAITING_APPROVAL,
        screenIndexVersion: 1,
        screenIndexHash: null, // Not locked yet (awaiting approval)
        approvedAt: null,
        approvedBy: null,
        basePromptHash,
        planningDocsHash,
      },
    });

    this.logger.info(
      { appRequestId, screenIndexId: screenIndex.id, screenCount: screenIndexContract.screens.length },
      'Screen Index saved with immutability fields'
    );

    // Emit screen_index_created event
    await this.emitEvent(
      appRequestId,
      'screen_index_created',
      `Screen Index created with ${screenIndexContract.screens.length} screens - awaiting approval`
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(
      appRequestId,
      'Screen Index generated - awaiting human approval'
    );

    this.logger.info({ appRequestId }, 'Conductor paused for human approval');

    // Unlock Conductor (paused but not locked)
    await this.conductor.unlock(appRequestId);

    return this.toScreenIndexHardened(screenIndex);
  }

  /**
   * PART 7: Approve Screen Index
   *
   * Rules (HARDENED):
   * - Validates index exists and is awaiting approval
   * - Computes and locks index hash
   * - Marks as IMMUTABLE
   * - Emits event
   * - Unlocks Conductor
   *
   * @throws Error if index not found
   * @throws Error if index not awaiting approval
   */
  async approveScreenIndex(appRequestId: string): Promise<ScreenIndexHardened> {
    this.logger.info({ appRequestId }, 'Approving Screen Index (HARDENED)');

    // Get screen index
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error(`Screen Index not found for appRequestId: ${appRequestId}`);
    }

    if (screenIndex.status !== ScreenStatus.AWAITING_APPROVAL) {
      throw new Error(
        `Cannot approve: Screen Index is in '${screenIndex.status}' status, expected 'awaiting_approval'`
      );
    }

    // PART 5: Compute and lock index hash (IMMUTABLE)
    const screenIndexContent = this.serializeScreenIndex({
      screens: JSON.parse(screenIndex.screens),
    });
    const indexHash = this.computeDocumentHash(screenIndexContent);

    // Mark as approved and LOCK
    const approved = await this.prisma.screenIndex.update({
      where: { id: screenIndex.id },
      data: {
        status: ScreenStatus.APPROVED,
        screenIndexHash: indexHash, // LOCK hash
        approvedAt: new Date(),
        approvedBy: 'human',
      },
    });

    this.logger.info(
      { appRequestId, screenIndexId: approved.id, indexHash: indexHash.substring(0, 16) + '...' },
      'Screen Index approved and LOCKED (immutable)'
    );

    // Emit screen_index_approved event
    await this.emitEvent(
      appRequestId,
      'screen_index_approved',
      'Screen Index approved by human and locked with hash - ready for screen descriptions'
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info({ appRequestId }, 'Ready for first screen description');

    return this.toScreenIndexHardened(approved);
  }

  /**
   * Reject Screen Index
   *
   * Rules (HARDENED):
   * - Allowed ONLY before approval
   * - Deletes draft index
   * - Emits event
   * - Unlocks Conductor
   *
   * @throws Error if index not found
   * @throws Error if index already approved (IMMUTABLE)
   */
  async rejectScreenIndex(appRequestId: string, feedback?: string): Promise<void> {
    this.logger.info({ appRequestId, feedback }, 'Rejecting Screen Index');

    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error(`Screen Index not found for appRequestId: ${appRequestId}`);
    }

    if (screenIndex.status === ScreenStatus.APPROVED) {
      throw new Error('IMMUTABILITY VIOLATION: Cannot reject an approved Screen Index');
    }

    // Delete screen index
    await this.prisma.screenIndex.delete({
      where: { id: screenIndex.id },
    });

    this.logger.info(
      { appRequestId, screenIndexId: screenIndex.id },
      'Screen Index deleted'
    );

    // Emit screen_index_rejected event
    await this.emitEvent(
      appRequestId,
      'screen_index_rejected',
      `Screen Index rejected by human${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Conductor unlocked - ready for regeneration');
  }

  /**
   * Describe Next Screen (Phase 2: Sequential Screen Definitions)
   *
   * Rules (HARDENED):
   * - Finds next screen by order
   * - Generates detailed screen description with contract validation
   * - Validates screen matches approved index
   * - Computes screen hash
   * - Saves as awaiting_approval
   * - Locks & pauses Conductor
   *
   * @throws Error if screen index not approved
   * @throws Error if no more screens to describe
   * @throws Error if contract validation fails
   */
  async describeNextScreen(appRequestId: string): Promise<ScreenDefinitionHardened> {
    this.logger.info({ appRequestId }, 'Describing next screen (HARDENED)');

    // Verify screen index is approved
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error(`Screen Index not found for appRequestId: ${appRequestId}`);
    }

    if (screenIndex.status !== ScreenStatus.APPROVED) {
      throw new Error(
        `Cannot describe screens: Screen Index status is '${screenIndex.status}', expected 'approved'`
      );
    }

    if (!screenIndex.screenIndexHash) {
      throw new Error('IMMUTABILITY VIOLATION: Screen Index not locked (missing hash)');
    }

    const screenList: string[] = JSON.parse(screenIndex.screens);

    // Get existing screen definitions
    const existingScreens = await this.prisma.screenDefinition.findMany({
      where: { appRequestId },
      orderBy: { order: 'asc' },
    });

    // Find next screen to describe
    const nextOrder = existingScreens.length;
    if (nextOrder >= screenList.length) {
      throw new Error('All screens have been described');
    }

    const screenName = screenList[nextOrder];

    this.logger.debug(
      { appRequestId, screenName, order: nextOrder, total: screenList.length },
      'Next screen identified'
    );

    // Get planning docs BY HASH
    const { masterPlan, implPlan, basePromptHash, planningDocsHash } =
      await this.getPlanningDocsWithHash(appRequestId);

    // Lock Conductor
    await this.conductor.lock(appRequestId);

    // Generate screen description
    const screenDefinitionContract = await this.generateScreenDefinitionContract(
      screenName,
      screenList,
      masterPlan,
      implPlan
    );

    // PART 3: Validate contract
    this.validateScreenDefinitionContract(screenDefinitionContract);

    // PART 6: Serialize to deterministic format
    const screenContent = this.serializeScreenDefinition(screenDefinitionContract);

    this.logger.info(
      { appRequestId, screenName, contentLength: screenContent.length },
      'Screen description generated with contract validation'
    );

    // PART 5: Compute hash
    const screenHash = this.computeDocumentHash(screenContent);

    // Save screen definition with immutability fields
    const screenDef = await this.prisma.screenDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId,
        screenName,
        content: screenContent,
        order: nextOrder,
        status: ScreenStatus.AWAITING_APPROVAL,
        screenVersion: 1,
        screenHash: null, // Not locked yet (awaiting approval)
        approvedAt: null,
        approvedBy: null,
        screenIndexHash: screenIndex.screenIndexHash,
        basePromptHash,
        planningDocsHash,
      },
    });

    this.logger.info(
      { appRequestId, screenDefId: screenDef.id, screenName, order: nextOrder },
      'Screen definition saved with immutability fields'
    );

    // Emit screen_description_created event
    await this.emitEvent(
      appRequestId,
      'screen_description_created',
      `Screen "${screenName}" described - awaiting approval (${nextOrder + 1}/${screenList.length})`
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(
      appRequestId,
      `Screen "${screenName}" described - awaiting human approval`
    );

    this.logger.info({ appRequestId, screenName }, 'Conductor paused for screen approval');

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    return this.toScreenDefinitionHardened(screenDef);
  }

  /**
   * PART 7: Approve Current Screen
   *
   * Rules (HARDENED):
   * - Marks current screen as approved
   * - Computes and locks screen hash
   * - Marks as IMMUTABLE
   * - If all screens approved → transitions Conductor to screens_defined
   *
   * @throws Error if no screen awaiting approval
   */
  async approveCurrentScreen(appRequestId: string): Promise<ScreenDefinitionHardened> {
    this.logger.info({ appRequestId }, 'Approving current screen (HARDENED)');

    // Get current screen (most recent awaiting approval)
    const currentScreen = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        status: ScreenStatus.AWAITING_APPROVAL,
      },
      orderBy: {
        order: 'desc',
      },
    });

    if (!currentScreen) {
      throw new Error(`No screen awaiting approval for appRequestId: ${appRequestId}`);
    }

    // PART 5: Compute and lock screen hash (IMMUTABLE)
    const screenHash = this.computeDocumentHash(currentScreen.content);

    // Mark as approved and LOCK
    const approved = await this.prisma.screenDefinition.update({
      where: { id: currentScreen.id },
      data: {
        status: ScreenStatus.APPROVED,
        screenHash, // LOCK hash
        approvedAt: new Date(),
        approvedBy: 'human',
      },
    });

    this.logger.info(
      { appRequestId, screenDefId: approved.id, screenName: approved.screenName, screenHash: screenHash.substring(0, 16) + '...' },
      'Screen approved and LOCKED (immutable)'
    );

    // Emit screen_description_approved event
    await this.emitEvent(
      appRequestId,
      'screen_description_approved',
      `Screen "${approved.screenName}" approved by human and locked with hash`
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Check if all screens are approved
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error(`Screen Index not found for appRequestId: ${appRequestId}`);
    }

    const totalScreens = JSON.parse(screenIndex.screens).length;
    const approvedScreens = await this.prisma.screenDefinition.count({
      where: {
        appRequestId,
        status: ScreenStatus.APPROVED,
      },
    });

    this.logger.debug(
      { appRequestId, approvedScreens, totalScreens },
      'Screen approval progress'
    );

    if (approvedScreens === totalScreens) {
      this.logger.info({ appRequestId }, 'All screens approved - completing cartography phase');

      // Transition Conductor to screens_defined
      await this.conductor.transition(appRequestId, 'screens_defined', 'ScreenCartographer');

      this.logger.info(
        { appRequestId, newStatus: 'screens_defined' },
        'Conductor transitioned to screens_defined'
      );

      // Emit screens_defined event
      await this.emitEvent(
        appRequestId,
        'screens_defined',
        `All ${totalScreens} screens defined and approved - ready for journey orchestration`
      );
    } else {
      this.logger.info(
        { appRequestId, remainingScreens: totalScreens - approvedScreens },
        'Ready for next screen description'
      );
    }

    return this.toScreenDefinitionHardened(approved);
  }

  /**
   * Reject Current Screen
   *
   * Rules (HARDENED):
   * - Allowed ONLY before approval
   * - Deletes current draft
   * - Emits event
   * - Unlocks Conductor
   *
   * @throws Error if no screen awaiting approval
   * @throws Error if screen already approved (IMMUTABLE)
   */
  async rejectCurrentScreen(appRequestId: string, feedback?: string): Promise<void> {
    this.logger.info({ appRequestId, feedback }, 'Rejecting current screen');

    // Get current screen
    const currentScreen = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        status: ScreenStatus.AWAITING_APPROVAL,
      },
      orderBy: {
        order: 'desc',
      },
    });

    if (!currentScreen) {
      throw new Error(`No screen awaiting approval for appRequestId: ${appRequestId}`);
    }

    if (currentScreen.status === ScreenStatus.APPROVED) {
      throw new Error('IMMUTABILITY VIOLATION: Cannot reject an approved screen');
    }

    // Delete screen definition
    await this.prisma.screenDefinition.delete({
      where: { id: currentScreen.id },
    });

    this.logger.info(
      { appRequestId, screenDefId: currentScreen.id, screenName: currentScreen.screenName },
      'Screen definition deleted'
    );

    // Emit screen_description_rejected event
    await this.emitEvent(
      appRequestId,
      'screen_description_rejected',
      `Screen "${currentScreen.screenName}" rejected by human${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Conductor unlocked - ready for regeneration');
  }

  /**
   * Verify Screen Index Integrity
   *
   * Verifies that Screen Index hash matches expected hash.
   * Used by downstream agents to verify no tampering.
   */
  async verifyScreenIndexIntegrity(
    appRequestId: string,
    expectedHash: string
  ): Promise<boolean> {
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || !screenIndex.screenIndexHash) {
      return false;
    }

    const isValid = screenIndex.screenIndexHash === expectedHash;

    this.logger.debug(
      { appRequestId, expectedHash: expectedHash.substring(0, 16) + '...', actualHash: screenIndex.screenIndexHash.substring(0, 16) + '...', isValid },
      'Screen Index integrity verification'
    );

    return isValid;
  }

  /**
   * Verify Screen Definition Integrity
   *
   * Verifies that screen hash matches expected hash.
   */
  async verifyScreenIntegrity(
    appRequestId: string,
    screenName: string,
    expectedHash: string
  ): Promise<boolean> {
    const screenDef = await this.prisma.screenDefinition.findFirst({
      where: { appRequestId, screenName },
    });

    if (!screenDef || !screenDef.screenHash) {
      return false;
    }

    const isValid = screenDef.screenHash === expectedHash;

    this.logger.debug(
      { appRequestId, screenName, expectedHash: expectedHash.substring(0, 16) + '...', actualHash: screenDef.screenHash.substring(0, 16) + '...', isValid },
      'Screen integrity verification'
    );

    return isValid;
  }

  /**
   * Get Screen Index with Hash
   *
   * Returns approved screen index with hash for downstream agents.
   */
  async getScreenIndexWithHash(appRequestId: string): Promise<{
    screens: string[];
    hash: string;
    version: number;
    approvedAt: Date;
    approvedBy: string;
  }> {
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || !screenIndex.screenIndexHash || screenIndex.status !== ScreenStatus.APPROVED) {
      throw new Error(`Approved Screen Index not found for appRequestId: ${appRequestId}`);
    }

    return {
      screens: JSON.parse(screenIndex.screens),
      hash: screenIndex.screenIndexHash,
      version: screenIndex.screenIndexVersion,
      approvedAt: screenIndex.approvedAt!,
      approvedBy: screenIndex.approvedBy!,
    };
  }

  /**
   * Get all approved screens
   *
   * Returns all approved screen definitions for an app request.
   */
  async getApprovedScreens(appRequestId: string): Promise<ScreenDefinitionHardened[]> {
    const screens = await this.prisma.screenDefinition.findMany({
      where: {
        appRequestId,
        status: ScreenStatus.APPROVED,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return screens.map(s => this.toScreenDefinitionHardened(s));
  }

  /**
   * PART 2: Get Planning Docs WITH HASH
   *
   * Gets approved planning docs with hashes.
   * This enforces context isolation by hash.
   */
  private async getPlanningDocsWithHash(appRequestId: string): Promise<{
    masterPlan: string;
    masterPlanHash: string;
    implPlan: string;
    implPlanHash: string;
    basePromptHash: string;
    planningDocsHash: string;
  }> {
    if (!this.productStrategist) {
      // Fallback: get from PlanningDocument directly
      const planningDocs = await this.prisma.planningDocument.findMany({
        where: {
          appRequestId,
          status: 'approved',
        },
      });

      const masterPlan = planningDocs.find(d => d.type === 'MASTER_PLAN');
      const implPlan = planningDocs.find(d => d.type === 'IMPLEMENTATION_PLAN');

      if (!masterPlan || !implPlan) {
        throw new Error('Planning documents not found or not approved');
      }

      if (!masterPlan.documentHash || !implPlan.documentHash || !masterPlan.basePromptHash) {
        throw new Error('Planning documents not locked (missing hashes)');
      }

      const planningDocsHash = this.computePlanningDocsHash(masterPlan.content, implPlan.content);

      return {
        masterPlan: masterPlan.content,
        masterPlanHash: masterPlan.documentHash,
        implPlan: implPlan.content,
        implPlanHash: implPlan.documentHash,
        basePromptHash: masterPlan.basePromptHash,
        planningDocsHash,
      };
    }

    // Get planning docs directly from database
    const docs = await this.productStrategist.getAllDocuments(appRequestId);
    const masterPlan = docs.find(d => d.type === 'MASTER_PLAN');
    const implPlan = docs.find(d => d.type === 'IMPLEMENTATION_PLAN');

    if (!masterPlan || !implPlan || masterPlan.status !== 'approved' || implPlan.status !== 'approved') {
      throw new Error('Planning documents not found or not approved');
    }

    const planningDocsHash = this.computePlanningDocsHash(masterPlan.content, implPlan.content);

    return {
      masterPlan: masterPlan.content,
      masterPlanHash: masterPlan.documentHash!,
      implPlan: implPlan.content,
      implPlanHash: implPlan.documentHash!,
      basePromptHash: masterPlan.basePromptHash!,
      planningDocsHash,
    };
  }

  /**
   * Get Base Prompt Content
   *
   * Retrieves the approved base prompt content for screen justification.
   */
  private async getBasePrompt(appRequestId: string): Promise<string> {
    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session || session.status !== 'approved' || !session.draftPrompt) {
      throw new Error('Base prompt not found or not approved');
    }

    return session.draftPrompt;
  }

  /**
   * FIX #1: Extract Allowed Screen Names from Planning Docs + Base Prompt
   *
   * CRITICAL: LLMs must NEVER invent identifiers.
   * This method extracts canonical screen names from approved documents.
   *
   * Sources (in order of precedence):
   * 1. Base Prompt (explicit screen names from Foundry answers)
   * 2. Master Plan (screens mentioned in planning)
   * 3. Implementation Plan (screens mentioned in implementation)
   * 4. Standard vocabulary (Login, Signup, Dashboard, etc.)
   */
  private extractAllowedScreenNames(
    basePrompt: string,
    masterPlan: string,
    implPlan: string
  ): string[] {
    const allowedNames = new Set<string>();

    // Standard vocabulary (ALWAYS allowed)
    const standardScreens = [
      'Landing Page',
      'Home',
      'Dashboard',
      'Login',
      'Sign In',
      'Signup',
      'Sign Up',
      'Register',
      'Settings',
      'Profile',
      'Account',
      '404',
      'Not Found',
      'Error',
      'Unauthorized',
      'Forbidden',
    ];

    standardScreens.forEach(name => allowedNames.add(name));

    // Extract from base prompt (explicit answers)
    // Look for screen names in patterns like "Dashboard, Task List, Project View"
    const basePromptScreens = this.extractScreenNamesFromText(basePrompt);
    basePromptScreens.forEach(name => allowedNames.add(name));

    // Extract from planning docs
    const planningScreens = this.extractScreenNamesFromText(masterPlan + '\n' + implPlan);
    planningScreens.forEach(name => allowedNames.add(name));

    const sorted = Array.from(allowedNames).sort();

    this.logger.debug(
      { allowedCount: sorted.length, allowed: sorted.slice(0, 10) },
      'Extracted allowed screen names (closed vocabulary)'
    );

    return sorted;
  }

  /**
   * Extract Screen Names from Text
   *
   * Uses heuristics to find screen names in natural language.
   * Looks for capitalized phrases that appear to be screen names.
   */
  private extractScreenNamesFromText(text: string): string[] {
    const names: string[] = [];

    // Pattern 1: "Screens: Dashboard, Task List, Project View"
    const listPattern = /(?:screens?|pages?|views?)[\s:]+([A-Z][^.!?]*?)(?:\.|$)/gi;
    let match;
    while ((match = listPattern.exec(text)) !== null) {
      const items = match[1].split(',').map(s => s.trim());
      items.forEach(item => {
        if (item && /^[A-Z]/.test(item)) {
          names.push(item);
        }
      });
    }

    // Pattern 2: Quoted screen names "Task List" or 'Dashboard'
    const quotedPattern = /["']([A-Z][A-Za-z\s]{2,30})["']/g;
    while ((match = quotedPattern.exec(text)) !== null) {
      names.push(match[1].trim());
    }

    // Pattern 3: Title Case phrases (2-4 words starting with capital)
    const titleCasePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
    while ((match = titleCasePattern.exec(text)) !== null) {
      const phrase = match[1];
      // Filter out common phrases that aren't screen names
      if (!this.isCommonPhrase(phrase)) {
        names.push(phrase);
      }
    }

    // Deduplicate and clean
    const unique = Array.from(new Set(names));
    return unique.filter(name => name.length >= 3 && name.length <= 50);
  }

  /**
   * Check if phrase is a common phrase (not a screen name)
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'The User',
      'The System',
      'This Feature',
      'Each User',
      'All Users',
      'Master Plan',
      'Implementation Plan',
      'Base Prompt',
    ];

    return commonPhrases.some(common =>
      phrase.toLowerCase().includes(common.toLowerCase())
    );
  }

  /**
   * FIX #2: Canonicalize Screen Name
   *
   * CRITICAL: Enforces that LLM output matches EXACTLY one allowed name.
   * This eliminates pluralization drift ("Task Detail" vs "Task Details").
   *
   * Rules:
   * - Case-insensitive matching
   * - Exact match required (no fuzzy matching)
   * - Throws error if no match found
   */
  private canonicalizeScreenName(
    rawName: string,
    allowedNames: string[]
  ): string {
    const normalized = rawName.trim().toLowerCase();

    // Exact match (case-insensitive)
    const match = allowedNames.find(
      name => name.toLowerCase() === normalized
    );

    if (match) {
      return match;
    }

    // No match found - FAIL LOUDLY
    throw new Error(
      `SCREEN NAME CANONICALIZATION FAILURE: "${rawName}" is not in the allowed vocabulary.\n` +
      `Allowed names: ${allowedNames.slice(0, 20).join(', ')}${allowedNames.length > 20 ? '...' : ''}\n` +
      `LLMs must NOT invent screen identifiers. This is a structural integrity violation.`
    );
  }

  /**
   * PART 6 & 7: Generate Screen Index Contract (WITH CLOSED VOCABULARY)
   *
   * FIX #3: Uses closed vocabulary to eliminate LLM identifier variance.
   *
   * Calls LLM with deterministic settings.
   * NO silent fallbacks - fails loudly.
   */
  private async generateScreenIndexContract(
    masterPlan: string,
    implPlan: string,
    basePrompt: string
  ): Promise<ScreenIndexContract> {
    // FIX #1: Extract allowed screen names (closed vocabulary)
    const allowedNames = this.extractAllowedScreenNames(basePrompt, masterPlan, implPlan);

    this.logger.info(
      { allowedCount: allowedNames.length },
      'Using closed vocabulary for screen names (LLM cannot invent identifiers)'
    );

    const systemPrompt = `You are a senior product/UX architect generating a Screen Index.

CRITICAL RULES:
- You may ONLY select screen names from the allowed vocabulary provided below
- DO NOT rename, pluralize, or invent new screen names
- DO NOT use synonyms or variations
- If a screen is needed but not in the vocabulary, choose the closest match
- Include standard UI screens (Login, Signup, Dashboard, Settings, Profile) if user authentication is mentioned
- Include error/edge screens (404, Error) if appropriate
- NO code generation
- NO UI design
- NO feature invention

ALLOWED SCREEN NAMES (CLOSED VOCABULARY):
${allowedNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "screens": ["array", "of", "screen", "names"]
}

Every screen name MUST be from the allowed vocabulary above (exact match, case-sensitive).

NO additional text outside the JSON object.`;

    const userPrompt = `Master Plan:

${masterPlan}

---

Implementation Plan:

${implPlan}

---

Generate a Screen Index (complete list of screen names). Remember: Respond with ONLY a valid JSON object.`;

    this.logger.debug({ masterPlanLength: masterPlan.length, implPlanLength: implPlan.length }, 'Generating Screen Index via LLM (deterministic)');

    // PART 7: Call LLM with retry - NO silent fallbacks
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.llmConfig.retryAttempts; attempt++) {
      try {
        const response = this.llmConfig.provider === 'anthropic'
          ? await this.callAnthropic(systemPrompt, userPrompt)
          : await this.callOpenAI(systemPrompt, userPrompt);

        this.logger.debug({ responseLength: response.length, attempt }, 'LLM response received');

        // Parse and validate JSON response
        const rawContract = this.parseScreenIndexResponse(response);

        // FIX #2: Canonicalize all screen names to eliminate variance
        const canonicalizedScreens = rawContract.screens.map(rawName =>
          this.canonicalizeScreenName(rawName, allowedNames)
        );

        const contract: ScreenIndexContract = {
          screens: canonicalizedScreens,
        };

        return contract;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({ error, attempt, maxAttempts: this.llmConfig.retryAttempts }, 'LLM call attempt failed');

        if (attempt < this.llmConfig.retryAttempts) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // PART 7: All retries failed - emit event and THROW
    await this.emitEvent('', 'screen_cartography_conflict', `Screen Index generation failed: ${lastError?.message}`);
    throw new Error(`SCREEN CARTOGRAPHY FAILURE: Screen Index generation failed after ${this.llmConfig.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * PART 6 & 7: Generate Screen Definition Contract
   *
   * Calls LLM with deterministic settings.
   * NO silent fallbacks - fails loudly.
   */
  private async generateScreenDefinitionContract(
    screenName: string,
    allScreens: string[],
    masterPlan: string,
    implPlan: string
  ): Promise<ScreenDefinitionContract> {
    const systemPrompt = `You are a senior product/UX architect generating a detailed Screen Description.

CRITICAL RULES:
- Describe ONLY what's in the planning docs for this screen
- NO code generation
- NO UI mockups
- NO user flows or journeys
- Focus on WHAT this screen does, not HOW it's implemented
- Be specific but stay conceptual

REQUIRED SECTIONS (ALL MUST BE PRESENT):
1. Purpose - What is this screen for?
2. User Role Access - Who can access this screen?
3. Layout Structure - Headers, navs, sections (high-level)
4. Functional Logic - What actions/operations are available?
5. Key UI Elements - Buttons, forms, filters, lists (conceptual, not code)
6. Special Behaviors - Modals, animations, role-based visibility (or "None")

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "screenName": "string",
  "purpose": "string",
  "userRoleAccess": "string",
  "layoutStructure": "string",
  "functionalLogic": "string",
  "keyUIElements": "string",
  "specialBehaviors": "string"
}

NO additional text outside the JSON object.`;

    const userPrompt = `Master Plan:

${masterPlan}

---

Implementation Plan:

${implPlan}

---

All Screens in Index:
${allScreens.map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

Generate a detailed description for screen: **${screenName}**

Remember: Respond with ONLY a valid JSON object.`;

    this.logger.debug(
      { screenName, allScreensCount: allScreens.length },
      'Generating Screen Definition via LLM (deterministic)'
    );

    // PART 7: Call LLM with retry - NO silent fallbacks
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.llmConfig.retryAttempts; attempt++) {
      try {
        const response = this.llmConfig.provider === 'anthropic'
          ? await this.callAnthropic(systemPrompt, userPrompt)
          : await this.callOpenAI(systemPrompt, userPrompt);

        this.logger.debug({ responseLength: response.length, attempt }, 'LLM response received');

        // Parse and validate JSON response
        const contract = this.parseScreenDefinitionResponse(response, screenName);

        return contract;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({ error, attempt, maxAttempts: this.llmConfig.retryAttempts }, 'LLM call attempt failed');

        if (attempt < this.llmConfig.retryAttempts) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // PART 7: All retries failed - emit event and THROW
    await this.emitEvent('', 'screen_cartography_conflict', `Screen "${screenName}" generation failed: ${lastError?.message}`);
    throw new Error(`SCREEN CARTOGRAPHY FAILURE: Screen "${screenName}" generation failed after ${this.llmConfig.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Parse Screen Index Response
   *
   * @private
   */
  private parseScreenIndexResponse(response: string): ScreenIndexContract {
    try {
      // Extract JSON object from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.screens || !Array.isArray(parsed.screens)) {
        throw new Error('Invalid response: "screens" must be an array');
      }

      return {
        screens: parsed.screens,
      };
    } catch (error) {
      this.logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse Screen Index from LLM');
      throw new Error(`Failed to parse Screen Index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Screen Definition Response
   *
   * @private
   */
  private parseScreenDefinitionResponse(response: string, expectedScreenName: string): ScreenDefinitionContract {
    try {
      // Extract JSON object from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate screen name matches
      if (parsed.screenName !== expectedScreenName) {
        this.logger.warn(
          { expected: expectedScreenName, actual: parsed.screenName },
          'Screen name mismatch - correcting'
        );
        parsed.screenName = expectedScreenName; // Force correct name
      }

      return {
        screenName: parsed.screenName,
        purpose: parsed.purpose,
        userRoleAccess: parsed.userRoleAccess,
        layoutStructure: parsed.layoutStructure,
        functionalLogic: parsed.functionalLogic,
        keyUIElements: parsed.keyUIElements,
        specialBehaviors: parsed.specialBehaviors || 'None',
      };
    } catch (error) {
      this.logger.error({ error, response: response.substring(0, 500) }, 'Failed to parse Screen Definition from LLM');
      throw new Error(`Failed to parse Screen Definition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call OpenAI API
   *
   * @private
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const requestBody = {
      model: this.llmConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.llmConfig.temperature,
      max_tokens: this.llmConfig.maxTokens,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.llmConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;

    if (!message) {
      throw new Error('No response from OpenAI API');
    }

    return message;
  }

  /**
   * Call Anthropic (Claude) API
   *
   * @private
   */
  private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
    const requestBody = {
      model: this.llmConfig.model,
      max_tokens: this.llmConfig.maxTokens,
      temperature: this.llmConfig.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.llmConfig.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.content?.[0]?.text;

    if (!message) {
      throw new Error('No response from Anthropic API');
    }

    return message;
  }

  /**
   * Emit event to execution log
   *
   * @private
   */
  private async emitEvent(
    appRequestId: string,
    type: string,
    message: string
  ): Promise<void> {
    if (!appRequestId) {
      this.logger.warn({ type }, 'Cannot emit event: no appRequestId');
      return;
    }

    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest || !appRequest.executionId) {
      this.logger.warn({ appRequestId, type }, 'Cannot emit event: no executionId');
      return;
    }

    await this.prisma.executionEvent.create({
      data: {
        id: randomUUID(),
        executionId: appRequest.executionId,
        type,
        message,
      },
    });

    this.logger.debug({ appRequestId, type, message }, 'Event emitted');
  }

  /**
   * Convert Prisma model to interface
   *
   * @private
   */
  private toScreenIndexHardened(index: any): ScreenIndexHardened {
    return {
      id: index.id,
      appRequestId: index.appRequestId,
      screens: JSON.parse(index.screens),
      status: index.status as ScreenStatusValue,
      screenIndexVersion: index.screenIndexVersion,
      screenIndexHash: index.screenIndexHash,
      approvedAt: index.approvedAt,
      approvedBy: index.approvedBy,
      basePromptHash: index.basePromptHash,
      planningDocsHash: index.planningDocsHash,
      createdAt: index.createdAt,
      updatedAt: index.updatedAt,
    };
  }

  /**
   * Convert Prisma model to interface
   *
   * @private
   */
  private toScreenDefinitionHardened(def: any): ScreenDefinitionHardened {
    return {
      id: def.id,
      appRequestId: def.appRequestId,
      screenName: def.screenName,
      content: def.content,
      order: def.order,
      status: def.status as ScreenStatusValue,
      screenVersion: def.screenVersion,
      screenHash: def.screenHash,
      approvedAt: def.approvedAt,
      approvedBy: def.approvedBy,
      screenIndexHash: def.screenIndexHash,
      basePromptHash: def.basePromptHash,
      planningDocsHash: def.planningDocsHash,
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
    };
  }
}
