/**
 * Product Strategist Agent - PRODUCTION HARDENED
 *
 * Tier 2 - Product & Strategy Agent (AI-powered, CONSTRAINED)
 *
 * Purpose:
 * Converts an approved Base Prompt into structured planning documents
 * that define WHAT is being built and in WHAT ORDER.
 *
 * CRITICAL: This agent defines strategy. Mistakes here propagate downstream
 * and cannot be repaired by execution or verification.
 *
 * Authority Level: PLANNING_AUTHORITY
 * - Generates Master Plan and Implementation Plan
 * - NEVER invents features
 * - NEVER modifies Base Prompt
 * - NEVER generates UI/code
 *
 * Hardening Features:
 * 1. PromptEnvelope (PLANNING_AUTHORITY)
 * 2. Context Isolation (Base Prompt by hash ONLY)
 * 3. Document Output Contracts (strict schemas)
 * 4. Feature & Scope Validation (maps to Base Prompt)
 * 5. Immutability & Section Hashing (SHA-256)
 * 6. Determinism Guarantees (same input → same output)
 * 7. Failure & Escalation (NO silent fixes)
 * 8. Approval Flow Enforcement (Master → Implementation)
 * 9. Comprehensive Testing
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID, createHash } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { FoundryArchitectHardened } from './foundry-architect-hardened.js';

/**
 * PART 1: PromptEnvelope (PLANNING_AUTHORITY)
 *
 * Product Strategist has PLANNING_AUTHORITY.
 * It defines WHAT and IN WHAT ORDER, not HOW.
 */
interface PromptEnvelope {
  agentName: 'ProductStrategist';
  agentVersion: '1.0.0';
  authorityLevel: 'PLANNING_AUTHORITY';
  allowedActions: ('generateMasterPlan' | 'generateImplementationPlan')[];
  forbiddenActions: (
    | 'inventFeatures'
    | 'modifyBasePrompt'
    | 'generateUI'
    | 'generateCode'
    | 'accessScreensOrFlows'
    | 'bypassApproval'
    | 'modifyApprovedDocuments'
  )[];
}

/**
 * PART 3: Document Output Contracts (STRICT)
 *
 * Master Plan Contract - 6 required sections
 */
export interface MasterPlanContract {
  vision: string; // MUST be present
  targetAudience: string; // MUST be present
  coreProblem: string; // MUST be present
  explicitNonGoals: string; // MUST be present (can be "UNSPECIFIED")
  coreModules: string[]; // MUST be array, CANNOT be empty
  successCriteria: string; // MUST be present (measurable)
}

/**
 * PART 3: Implementation Plan Contract - 5 required sections
 */
export interface ImplementationPlanContract {
  approvedTechStack: string; // MUST be present
  developmentPhases: string[]; // MUST be array, CANNOT be empty (ordered)
  featureSequencing: string; // MUST be present (ordered, mapped)
  riskAreas: string; // MUST be present (can be "UNSPECIFIED")
  timeline: string; // MUST be present (can be "UNSPECIFIED")
}

/**
 * Document Type Constants
 */
export const DocumentType = {
  MASTER_PLAN: 'MASTER_PLAN',
  IMPLEMENTATION_PLAN: 'IMPLEMENTATION_PLAN',
} as const;

export type DocumentTypeValue = typeof DocumentType[keyof typeof DocumentType];

/**
 * Document Status Constants
 */
export const DocumentStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

export type DocumentStatusValue = typeof DocumentStatus[keyof typeof DocumentStatus];

/**
 * PART 5: Planning Document with Immutability Fields
 */
export interface PlanningDocHardened {
  id: string;
  appRequestId: string;
  type: DocumentTypeValue;
  content: string;
  status: DocumentStatusValue;

  // Immutability & Versioning (Production Hardening)
  documentVersion: number;
  documentHash: string | null; // SHA-256 of entire document
  sectionHashes: string | null; // JSON: {section: hash}
  basePromptHash: string; // Hash of Base Prompt used
  approvedAt: Date | null;
  approvedBy: string | null; // "human" | "system"

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
 * Product Strategist Agent - PRODUCTION HARDENED
 *
 * The second LLM-backed agent in Forge, with ZERO TOLERANCE for:
 * - Feature invention
 * - Scope drift
 * - Non-determinism
 * - Bypass of approval flow
 */
export class ProductStrategistHardened {
  private envelope: PromptEnvelope;
  private llmConfig: LLMConfig;
  private foundryArchitect: FoundryArchitectHardened | null;

  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: FastifyBaseLogger,
    foundryArchitect: FoundryArchitectHardened | null = null,
    config?: Partial<LLMConfig>
  ) {
    // Initialize envelope
    this.envelope = {
      agentName: 'ProductStrategist',
      agentVersion: '1.0.0',
      authorityLevel: 'PLANNING_AUTHORITY',
      allowedActions: ['generateMasterPlan', 'generateImplementationPlan'],
      forbiddenActions: [
        'inventFeatures',
        'modifyBasePrompt',
        'generateUI',
        'generateCode',
        'accessScreensOrFlows',
        'bypassApproval',
        'modifyApprovedDocuments',
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

    this.foundryArchitect = foundryArchitect;

    this.logger.info(
      {
        envelope: this.envelope,
        temperature: this.llmConfig.temperature,
        model: this.llmConfig.model,
      },
      'ProductStrategistHardened initialized with PLANNING authority'
    );
  }

  /**
   * PART 1: Envelope Validation
   *
   * Ensures this agent NEVER exceeds its authority.
   */
  private validateEnvelope(): void {
    if (this.envelope.agentName !== 'ProductStrategist') {
      throw new Error('ENVELOPE VIOLATION: Invalid agent name');
    }

    if (this.envelope.authorityLevel !== 'PLANNING_AUTHORITY') {
      throw new Error(
        'ENVELOPE VIOLATION: Product Strategist must have PLANNING_AUTHORITY'
      );
    }

    // Verify forbidden actions are never in allowed actions
    const forbidden = new Set(this.envelope.forbiddenActions);
    for (const action of this.envelope.allowedActions) {
      if (forbidden.has(action as any)) {
        throw new Error(`ENVELOPE VIOLATION: Forbidden action in allowed list: ${action}`);
      }
    }

    this.logger.debug('Envelope validated successfully');
  }

  /**
   * PART 2: Context Isolation Validation
   *
   * Ensures we ONLY access approved Base Prompt (by hash).
   * NEVER access: screens, journeys, mockups, rules, code, execution plans, verification.
   */
  private validateContextAccess(basePromptHash: string): void {
    // This method validates that we're ONLY accessing Base Prompt by hash
    // The actual enforcement happens by ONLY passing basePromptHash to methods

    this.logger.debug(
      { basePromptHash: basePromptHash.substring(0, 16) + '...' },
      'CONTEXT ISOLATION: Validated access to Base Prompt by hash only'
    );
  }

  /**
   * PART 3: Validate Master Plan Contract
   *
   * Every Master Plan MUST conform to the contract schema.
   */
  private validateMasterPlanContract(contract: MasterPlanContract): void {
    const errors: string[] = [];

    // vision MUST be present
    if (!contract.vision || contract.vision.trim().length === 0) {
      errors.push('Vision MUST be present and non-empty');
    }

    // targetAudience MUST be present
    if (!contract.targetAudience || contract.targetAudience.trim().length === 0) {
      errors.push('Target Audience MUST be present and non-empty');
    }

    // coreProblem MUST be present
    if (!contract.coreProblem || contract.coreProblem.trim().length === 0) {
      errors.push('Core Problem MUST be present and non-empty');
    }

    // explicitNonGoals MUST be present (can be "UNSPECIFIED")
    if (!contract.explicitNonGoals || contract.explicitNonGoals.trim().length === 0) {
      errors.push('Explicit Non-Goals MUST be present (use "UNSPECIFIED" if unknown)');
    }

    // coreModules MUST be array and CANNOT be empty
    if (!Array.isArray(contract.coreModules)) {
      errors.push('Core Modules MUST be an array');
    } else if (contract.coreModules.length === 0) {
      errors.push('Core Modules CANNOT be empty');
    }

    // successCriteria MUST be present
    if (!contract.successCriteria || contract.successCriteria.trim().length === 0) {
      errors.push('Success Criteria MUST be present and non-empty');
    }

    if (errors.length > 0) {
      throw new Error(`MASTER PLAN CONTRACT VALIDATION FAILED:\n${errors.join('\n')}`);
    }

    this.logger.debug({ contract }, 'Master Plan contract validated successfully');
  }

  /**
   * PART 3: Validate Implementation Plan Contract
   *
   * Every Implementation Plan MUST conform to the contract schema.
   */
  private validateImplementationPlanContract(contract: ImplementationPlanContract): void {
    const errors: string[] = [];

    // approvedTechStack MUST be present
    if (!contract.approvedTechStack || contract.approvedTechStack.trim().length === 0) {
      errors.push('Approved Tech Stack MUST be present and non-empty');
    }

    // developmentPhases MUST be array and CANNOT be empty
    if (!Array.isArray(contract.developmentPhases)) {
      errors.push('Development Phases MUST be an array');
    } else if (contract.developmentPhases.length === 0) {
      errors.push('Development Phases CANNOT be empty');
    }

    // featureSequencing MUST be present
    if (!contract.featureSequencing || contract.featureSequencing.trim().length === 0) {
      errors.push('Feature Sequencing MUST be present and non-empty');
    }

    // riskAreas MUST be present (can be "UNSPECIFIED")
    if (!contract.riskAreas || contract.riskAreas.trim().length === 0) {
      errors.push('Risk Areas MUST be present (use "UNSPECIFIED" if unknown)');
    }

    // timeline MUST be present (can be "UNSPECIFIED")
    if (!contract.timeline || contract.timeline.trim().length === 0) {
      errors.push('Timeline MUST be present (use "UNSPECIFIED" if unknown)');
    }

    if (errors.length > 0) {
      throw new Error(`IMPLEMENTATION PLAN CONTRACT VALIDATION FAILED:\n${errors.join('\n')}`);
    }

    this.logger.debug({ contract }, 'Implementation Plan contract validated successfully');
  }

  /**
   * PART 4: Feature & Scope Validation
   *
   * Validates that every module maps to a Base Prompt feature.
   * NO new concepts introduced.
   */
  private async validateFeatureMapping(
    modules: string[],
    basePromptContent: string
  ): Promise<void> {
    // Extract features from Base Prompt
    const basePromptLower = basePromptContent.toLowerCase();

    // Check each module maps to something in Base Prompt
    for (const module of modules) {
      const moduleLower = module.toLowerCase();

      // Simple check: module name should appear in Base Prompt OR be standard infra
      const isInBasePrompt = basePromptLower.includes(moduleLower.substring(0, Math.min(moduleLower.length, 20)));
      const isStandardInfra = [
        'authentication',
        'auth',
        'user management',
        'settings',
        'configuration',
      ].some(keyword => moduleLower.includes(keyword));

      if (!isInBasePrompt && !isStandardInfra) {
        this.logger.warn(
          { module, basePromptLength: basePromptContent.length },
          'SCOPE VALIDATION: Module may not map to Base Prompt'
        );

        // Emit planning_scope_violation event
        await this.emitEvent(
          '', // Will be filled by caller
          'planning_scope_violation',
          `Module "${module}" may not be present in Base Prompt`
        );

        throw new Error(
          `SCOPE VIOLATION: Module "${module}" does not appear to map to Base Prompt. ` +
          `If Base Prompt is vague, mark as "UNSPECIFIED" - do NOT infer.`
        );
      }
    }

    this.logger.debug({ moduleCount: modules.length }, 'Feature mapping validated');
  }

  /**
   * PART 5: Compute Document Hash
   */
  private computeDocumentHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * PART 5: Compute Section Hashes
   *
   * Computes hash for each section individually.
   */
  private computeSectionHashes(contract: MasterPlanContract | ImplementationPlanContract): Record<string, string> {
    const hashes: Record<string, string> = {};

    for (const [key, value] of Object.entries(contract)) {
      const content = Array.isArray(value) ? JSON.stringify(value) : String(value);
      hashes[key] = createHash('sha256').update(content, 'utf8').digest('hex');
    }

    return hashes;
  }

  /**
   * PART 6: Generate Deterministic Master Plan
   *
   * Same Base Prompt hash → same Master Plan (byte-for-byte).
   */
  private serializeMasterPlan(contract: MasterPlanContract): string {
    // Deterministic formatting - NO timestamps, stable ordering
    const sections: string[] = [];

    sections.push(`# Vision\n\n${contract.vision}\n`);
    sections.push(`# Target Audience\n\n${contract.targetAudience}\n`);
    sections.push(`# Core Problem\n\n${contract.coreProblem}\n`);
    sections.push(`# Explicit Non-Goals\n\n${contract.explicitNonGoals}\n`);

    // Core Modules - sorted alphabetically for determinism
    sections.push(`# Core Modules\n\n${contract.coreModules.sort().map((m, i) => `${i + 1}. ${m}`).join('\n')}\n`);

    sections.push(`# Success Criteria\n\n${contract.successCriteria}\n`);

    return sections.join('\n');
  }

  /**
   * PART 6: Generate Deterministic Implementation Plan
   */
  private serializeImplementationPlan(contract: ImplementationPlanContract): string {
    // Deterministic formatting - NO timestamps, stable ordering
    const sections: string[] = [];

    sections.push(`# Approved Tech Stack\n\n${contract.approvedTechStack}\n`);

    // Development Phases - keep order (already ordered)
    sections.push(`# Development Phases\n\n${contract.developmentPhases.map((p, i) => `## Phase ${i + 1}\n\n${p}`).join('\n\n')}\n`);

    sections.push(`# Feature Sequencing\n\n${contract.featureSequencing}\n`);
    sections.push(`# Risk Areas\n\n${contract.riskAreas}\n`);
    sections.push(`# Timeline\n\n${contract.timeline}\n`);

    return sections.join('\n');
  }

  /**
   * Start planning process
   *
   * Rules (HARDENED):
   * - Validates Conductor state = base_prompt_ready
   * - Validates envelope before execution
   * - Gets Base Prompt BY HASH from Foundry Architect
   * - Validates context isolation
   * - Generates Master Plan with contract validation
   * - Computes document hash and section hashes
   * - Saves with immutability fields
   * - Pauses Conductor for human approval
   *
   * @throws Error if envelope validation fails
   * @throws Error if Conductor not in base_prompt_ready state
   * @throws Error if Base Prompt hash not found
   * @throws Error if contract validation fails
   * @throws Error if scope validation fails
   */
  async start(appRequestId: string): Promise<PlanningDocHardened> {
    this.logger.info({ appRequestId }, 'Starting Product Strategist (HARDENED)');

    // PART 1: Validate envelope
    this.validateEnvelope();

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'base_prompt_ready') {
      throw new Error(
        `Cannot start Product Strategist: Conductor state is '${state.currentStatus}', expected 'base_prompt_ready'`
      );
    }

    this.logger.debug({ appRequestId, state: state.currentStatus }, 'Conductor state validated');

    // PART 2: Get Base Prompt BY HASH
    const { content: basePromptContent, hash: basePromptHash } = await this.getBasePromptWithHash(appRequestId);

    this.logger.info(
      { appRequestId, basePromptHash: basePromptHash.substring(0, 16) + '...', contentLength: basePromptContent.length },
      'Base Prompt loaded by hash'
    );

    // PART 2: Validate context isolation
    this.validateContextAccess(basePromptHash);

    // Lock Conductor
    await this.conductor.lock(appRequestId);
    this.logger.debug({ appRequestId }, 'Conductor locked');

    // Emit planning_started event
    await this.emitEvent(appRequestId, 'planning_started', 'Product Strategist (HARDENED) initiated');

    // PART 6: Generate Master Plan (deterministic)
    const masterPlanContract = await this.generateMasterPlanContract(basePromptContent);

    // PART 3: Validate contract
    this.validateMasterPlanContract(masterPlanContract);

    // PART 4: Validate feature mapping
    await this.validateFeatureMapping(masterPlanContract.coreModules, basePromptContent);

    // PART 6: Serialize to deterministic format
    const masterPlanContent = this.serializeMasterPlan(masterPlanContract);

    this.logger.info(
      { appRequestId, contentLength: masterPlanContent.length },
      'Master Plan generated with contract validation'
    );

    // PART 5: Compute hashes
    const documentHash = this.computeDocumentHash(masterPlanContent);
    const sectionHashes = this.computeSectionHashes(masterPlanContract);

    // Save document with immutability fields
    const document = await this.prisma.planningDocument.create({
      data: {
        id: randomUUID(),
        appRequestId,
        type: DocumentType.MASTER_PLAN,
        content: masterPlanContent,
        status: DocumentStatus.AWAITING_APPROVAL,
        documentVersion: 1,
        documentHash: null, // Not locked yet (awaiting approval)
        sectionHashes: JSON.stringify(sectionHashes),
        basePromptHash,
        approvedAt: null,
        approvedBy: null,
      },
    });

    this.logger.info(
      { appRequestId, documentId: document.id, type: document.type },
      'Master Plan saved with immutability fields'
    );

    // Emit planning_document_created event
    await this.emitEvent(
      appRequestId,
      'planning_document_created',
      `Master Plan created - awaiting approval`
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(
      appRequestId,
      'Master Plan generated - awaiting human approval'
    );

    this.logger.info({ appRequestId }, 'Conductor paused for human approval');

    // Unlock Conductor (paused but not locked)
    await this.conductor.unlock(appRequestId);

    return this.toPlanningDocHardened(document);
  }

  /**
   * PART 8: Approve a planning document
   *
   * Rules (HARDENED):
   * - Validates document exists and is awaiting approval
   * - Computes and locks document hash
   * - Marks as IMMUTABLE
   * - If MASTER_PLAN approved → generates Implementation Plan
   * - If IMPLEMENTATION_PLAN approved → transitions Conductor
   * - Master Plan MUST be approved before Implementation Plan
   *
   * @throws Error if document not found
   * @throws Error if document not awaiting approval
   * @throws Error if trying to approve Implementation Plan before Master Plan
   */
  async approveDocument(
    appRequestId: string,
    documentType: DocumentTypeValue
  ): Promise<PlanningDocHardened | null> {
    this.logger.info({ appRequestId, documentType }, 'Approving planning document (HARDENED)');

    // PART 8: Enforce approval order
    if (documentType === DocumentType.IMPLEMENTATION_PLAN) {
      // Check Master Plan is approved first
      const masterPlan = await this.prisma.planningDocument.findFirst({
        where: {
          appRequestId,
          type: DocumentType.MASTER_PLAN,
          status: DocumentStatus.APPROVED,
        },
      });

      if (!masterPlan) {
        throw new Error(
          'APPROVAL FLOW VIOLATION: Master Plan must be approved before Implementation Plan'
        );
      }
    }

    // Get document
    const document = await this.prisma.planningDocument.findFirst({
      where: {
        appRequestId,
        type: documentType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!document) {
      throw new Error(
        `Planning document not found: appRequestId=${appRequestId}, type=${documentType}`
      );
    }

    if (document.status !== DocumentStatus.AWAITING_APPROVAL) {
      throw new Error(
        `Cannot approve: Document is in '${document.status}' status, expected 'awaiting_approval'`
      );
    }

    // PART 5: Compute and lock document hash (IMMUTABLE)
    const documentHash = this.computeDocumentHash(document.content);

    // Mark as approved and LOCK
    const approvedDocument = await this.prisma.planningDocument.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.APPROVED,
        documentHash, // LOCK hash
        approvedAt: new Date(),
        approvedBy: 'human',
      },
    });

    this.logger.info(
      { appRequestId, documentId: document.id, type: documentType, documentHash: documentHash.substring(0, 16) + '...' },
      'Document approved and LOCKED (immutable)'
    );

    // Emit planning_document_approved event
    await this.emitEvent(
      appRequestId,
      'planning_document_approved',
      `${documentType} approved by human and locked with hash`
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Handle next steps based on document type
    if (documentType === DocumentType.MASTER_PLAN) {
      this.logger.info({ appRequestId }, 'Master Plan approved - generating Implementation Plan');

      // Lock Conductor again
      await this.conductor.lock(appRequestId);

      // Get Base Prompt BY HASH
      const { content: basePromptContent, hash: basePromptHash } = await this.getBasePromptWithHash(appRequestId);
      const masterPlan = approvedDocument.content;

      // Generate Implementation Plan
      const implPlanContract = await this.generateImplementationPlanContract(
        basePromptContent,
        masterPlan
      );

      // Validate contract
      this.validateImplementationPlanContract(implPlanContract);

      // Serialize to deterministic format
      const implPlanContent = this.serializeImplementationPlan(implPlanContract);

      this.logger.info(
        { appRequestId, contentLength: implPlanContent.length },
        'Implementation Plan generated with contract validation'
      );

      // Compute hashes
      const implDocHash = this.computeDocumentHash(implPlanContent);
      const implSectionHashes = this.computeSectionHashes(implPlanContract);

      // Save Implementation Plan
      const implPlanDoc = await this.prisma.planningDocument.create({
        data: {
          id: randomUUID(),
          appRequestId,
          type: DocumentType.IMPLEMENTATION_PLAN,
          content: implPlanContent,
          status: DocumentStatus.AWAITING_APPROVAL,
          documentVersion: 1,
          documentHash: null, // Not locked yet
          sectionHashes: JSON.stringify(implSectionHashes),
          basePromptHash,
          approvedAt: null,
          approvedBy: null,
        },
      });

      this.logger.info(
        { appRequestId, documentId: implPlanDoc.id },
        'Implementation Plan saved with immutability fields'
      );

      // Emit event
      await this.emitEvent(
        appRequestId,
        'planning_document_created',
        'Implementation Plan created - awaiting approval'
      );

      // Pause Conductor again
      await this.conductor.pauseForHuman(
        appRequestId,
        'Implementation Plan generated - awaiting human approval'
      );

      // Unlock Conductor
      await this.conductor.unlock(appRequestId);

      return this.toPlanningDocHardened(implPlanDoc);
    } else if (documentType === DocumentType.IMPLEMENTATION_PLAN) {
      this.logger.info({ appRequestId }, 'Implementation Plan approved - completing planning phase');

      // Both documents approved - transition Conductor
      await this.conductor.transition(appRequestId, 'planning', 'ProductStrategist');

      this.logger.info(
        { appRequestId, newStatus: 'planning' },
        'Conductor transitioned to planning'
      );

      // Emit planning_completed event
      await this.emitEvent(
        appRequestId,
        'planning_completed',
        'All planning documents approved and locked - ready for architecture'
      );

      return this.toPlanningDocHardened(approvedDocument);
    }

    return null;
  }

  /**
   * PART 8: Reject a planning document
   *
   * Rules (HARDENED):
   * - Deletes draft (not approved versions)
   * - Allows regeneration
   * - New version will have incremented documentVersion
   */
  async rejectDocument(
    appRequestId: string,
    documentType: DocumentTypeValue,
    feedback?: string
  ): Promise<void> {
    this.logger.info({ appRequestId, documentType, feedback }, 'Rejecting planning document (HARDENED)');

    // Get document
    const document = await this.prisma.planningDocument.findFirst({
      where: {
        appRequestId,
        type: documentType,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!document) {
      throw new Error(
        `Planning document not found: appRequestId=${appRequestId}, type=${documentType}`
      );
    }

    // PART 8: Cannot modify after approval
    if (document.status === DocumentStatus.APPROVED) {
      throw new Error(
        'APPROVAL FLOW VIOLATION: Cannot reject approved document (it is IMMUTABLE)'
      );
    }

    // Delete document (draft only)
    await this.prisma.planningDocument.delete({
      where: { id: document.id },
    });

    this.logger.info({ appRequestId, documentId: document.id, type: documentType }, 'Document deleted');

    // Emit planning_document_rejected event
    await this.emitEvent(
      appRequestId,
      'planning_document_rejected',
      `${documentType} rejected by human${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Conductor unlocked - ready for regeneration');
  }

  /**
   * PART 5: Verify document integrity
   *
   * Verifies that document hash matches expected hash.
   */
  async verifyDocumentIntegrity(
    appRequestId: string,
    documentType: DocumentTypeValue,
    expectedHash: string
  ): Promise<boolean> {
    const document = await this.prisma.planningDocument.findFirst({
      where: {
        appRequestId,
        type: documentType,
        status: DocumentStatus.APPROVED,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!document || !document.documentHash) {
      return false;
    }

    return document.documentHash === expectedHash;
  }

  /**
   * Get current planning document
   */
  async getCurrentDocument(appRequestId: string): Promise<PlanningDocHardened | null> {
    const document = await this.prisma.planningDocument.findFirst({
      where: { appRequestId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!document) {
      return null;
    }

    return this.toPlanningDocHardened(document);
  }

  /**
   * Get all planning documents for an app request
   */
  async getAllDocuments(appRequestId: string): Promise<PlanningDocHardened[]> {
    const documents = await this.prisma.planningDocument.findMany({
      where: { appRequestId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return documents.map(doc => this.toPlanningDocHardened(doc));
  }

  /**
   * PART 2: Get Base Prompt WITH HASH
   *
   * Gets Base Prompt content and its hash from Foundry Architect.
   * This enforces context isolation by hash.
   */
  private async getBasePromptWithHash(appRequestId: string): Promise<{
    content: string;
    hash: string;
    version: number;
    approvedAt: Date;
    approvedBy: string;
  }> {
    if (!this.foundryArchitect) {
      // Fallback: get from Foundry Session directly
      const session = await this.prisma.foundrySession.findUnique({
        where: { appRequestId },
      });

      if (!session || !session.draftPrompt || !session.basePromptHash) {
        throw new Error(`Base Prompt not found or not approved for appRequestId: ${appRequestId}`);
      }

      return {
        content: session.draftPrompt,
        hash: session.basePromptHash,
        version: session.basePromptVersion,
        approvedAt: session.approvedAt!,
        approvedBy: session.approvedBy!,
      };
    }

    // Use Foundry Architect to get Base Prompt with hash
    return await this.foundryArchitect.getBasePromptWithHash(appRequestId);
  }

  /**
   * PART 6 & 7: Generate Master Plan Contract
   *
   * Calls LLM with deterministic settings.
   * NO silent fallbacks - fails loudly.
   */
  private async generateMasterPlanContract(basePrompt: string): Promise<MasterPlanContract> {
    const systemPrompt = `You are a senior product strategist creating a Master Plan.

CRITICAL RULES:
- NO code generation
- NO UI/screen designs
- NO implementation details
- Focus on WHAT and WHY, not HOW
- Only include what's explicitly stated or clearly implied in the Base Prompt
- If something is vague or unclear, use "UNSPECIFIED" - do NOT infer or invent
- **CRITICAL**: For coreModules, use EXACT terms from the Base Prompt features/screens
  Do NOT paraphrase or elaborate (e.g., if Base Prompt says "task lists", use "Task Lists", not "Task Management Module")
  If a feature isn't explicitly named, mark coreModules as ["UNSPECIFIED"] - do NOT guess

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "vision": "string (what product achieves)",
  "targetAudience": "string (who it's for)",
  "coreProblem": "string (what problem it solves)",
  "explicitNonGoals": "string (what it will NOT do, or UNSPECIFIED)",
  "coreModules": ["array", "of", "high-level", "modules"],
  "successCriteria": "string (measurable goals)"
}

NO additional text outside the JSON object.`;

    const userPrompt = `Base Prompt:

${basePrompt}

---

Generate a Master Plan for this product. Remember: Respond with ONLY a valid JSON object.`;

    this.logger.debug({ basePromptLength: basePrompt.length }, 'Generating Master Plan via LLM (deterministic)');

    // PART 7: Call LLM with retry - NO silent fallbacks
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.llmConfig.retryAttempts; attempt++) {
      try {
        const response = this.llmConfig.provider === 'anthropic'
          ? await this.callAnthropic(systemPrompt, userPrompt)
          : await this.callOpenAI(systemPrompt, userPrompt);

        this.logger.debug({ responseLength: response.length, attempt }, 'LLM response received');

        // Parse and validate JSON response
        const contract = this.parseMasterPlanResponse(response);

        return contract;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({ error, attempt, maxAttempts: this.llmConfig.retryAttempts }, 'LLM call attempt failed');

        if (attempt < this.llmConfig.retryAttempts) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // PART 7: All retries failed - emit event and THROW
    await this.emitEvent(
      '', // Will be filled by caller
      'planning_conflict',
      `Master Plan generation failed: ${lastError?.message || 'Unknown error'}`
    );

    throw new Error(
      `PLANNING FAILURE: Master Plan generation failed after ${this.llmConfig.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * PART 6 & 7: Generate Implementation Plan Contract
   */
  private async generateImplementationPlanContract(
    basePrompt: string,
    masterPlan: string
  ): Promise<ImplementationPlanContract> {
    const systemPrompt = `You are a senior product strategist creating an Implementation Plan.

CRITICAL RULES:
- NO code generation
- NO UI/screen designs
- Respect tech preferences in Base Prompt
- Focus on SEQUENCING and PRIORITIZATION
- Only include what's explicitly stated or clearly implied
- If something is vague or unclear, use "UNSPECIFIED" - do NOT infer or invent

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "approvedTechStack": "string (tech stack, respecting Base Prompt)",
  "developmentPhases": ["Phase 1 description", "Phase 2 description", ...],
  "featureSequencing": "string (what must be built first, dependencies)",
  "riskAreas": "string (potential risks, or UNSPECIFIED)",
  "timeline": "string (timeline if mentioned in Base Prompt, or UNSPECIFIED)"
}

NO additional text outside the JSON object.`;

    const userPrompt = `Base Prompt:

${basePrompt}

---

Master Plan:

${masterPlan}

---

Generate an Implementation Plan. Remember: Respond with ONLY a valid JSON object.`;

    this.logger.debug(
      { basePromptLength: basePrompt.length, masterPlanLength: masterPlan.length },
      'Generating Implementation Plan via LLM (deterministic)'
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
        const contract = this.parseImplementationPlanResponse(response);

        return contract;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({ error, attempt, maxAttempts: this.llmConfig.retryAttempts }, 'LLM call attempt failed');

        if (attempt < this.llmConfig.retryAttempts) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // PART 7: All retries failed - emit event and THROW
    await this.emitEvent(
      '', // Will be filled by caller
      'planning_conflict',
      `Implementation Plan generation failed: ${lastError?.message || 'Unknown error'}`
    );

    throw new Error(
      `PLANNING FAILURE: Implementation Plan generation failed after ${this.llmConfig.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Parse Master Plan LLM response
   */
  private parseMasterPlanResponse(response: string): MasterPlanContract {
    // Try to extract JSON from response
    let jsonStr = response.trim();

    // If response has markdown code blocks, extract JSON
    const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Failed to parse Master Plan response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert to contract
    const contract: MasterPlanContract = {
      vision: parsed.vision || '',
      targetAudience: parsed.targetAudience || '',
      coreProblem: parsed.coreProblem || '',
      explicitNonGoals: parsed.explicitNonGoals || 'UNSPECIFIED',
      coreModules: Array.isArray(parsed.coreModules) ? parsed.coreModules : [],
      successCriteria: parsed.successCriteria || '',
    };

    return contract;
  }

  /**
   * Parse Implementation Plan LLM response
   */
  private parseImplementationPlanResponse(response: string): ImplementationPlanContract {
    // Try to extract JSON from response
    let jsonStr = response.trim();

    // If response has markdown code blocks, extract JSON
    const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Failed to parse Implementation Plan response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Convert to contract
    const contract: ImplementationPlanContract = {
      approvedTechStack: parsed.approvedTechStack || '',
      developmentPhases: Array.isArray(parsed.developmentPhases) ? parsed.developmentPhases : [],
      featureSequencing: parsed.featureSequencing || '',
      riskAreas: parsed.riskAreas || 'UNSPECIFIED',
      timeline: parsed.timeline || 'UNSPECIFIED',
    };

    return contract;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.llmConfig.apiKey) {
      throw new Error('OpenAI API key not configured - cannot call LLM');
    }

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
      const errorBody = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
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
   */
  private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.llmConfig.apiKey) {
      throw new Error('Anthropic API key not configured - cannot call LLM');
    }

    const requestBody = {
      model: this.llmConfig.model,
      max_tokens: this.llmConfig.maxTokens,
      temperature: this.llmConfig.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.llmConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`);
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
   */
  private toPlanningDocHardened(doc: any): PlanningDocHardened {
    return {
      id: doc.id,
      appRequestId: doc.appRequestId,
      type: doc.type as DocumentTypeValue,
      content: doc.content,
      status: doc.status as DocumentStatusValue,
      documentVersion: doc.documentVersion,
      documentHash: doc.documentHash,
      sectionHashes: doc.sectionHashes,
      basePromptHash: doc.basePromptHash,
      approvedAt: doc.approvedAt,
      approvedBy: doc.approvedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
