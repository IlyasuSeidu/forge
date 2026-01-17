/**
 * Product Strategist Agent
 *
 * Tier 2 - Product & Strategy Agent (AI-powered)
 *
 * Purpose:
 * Converts an approved Base Prompt into structured planning documents
 * that define WHAT is being built and in WHAT ORDER, without touching
 * HOW it is implemented.
 *
 * Documents Generated (Sequential):
 * 1. Master Plan - Vision, target audience, core modules, success criteria
 * 2. Implementation Plan - Tech stack, phases, feature sequencing, timeline
 *
 * Critical Rules:
 * - ❌ Must NOT generate code
 * - ❌ Must NOT generate UI or screens
 * - ❌ Must NOT advance Conductor without human approval
 * - ❌ Must NOT modify Base Prompt
 * - ❌ Must NOT run unless state = base_prompt_ready
 * - ❌ Must NOT skip documents or reorder them
 * - ❌ Must NOT invent features not implied by Base Prompt
 * - ✅ May use LLM (GPT-5)
 * - ✅ Must pause for human approval after each document
 * - ✅ Must store every output in database
 * - ✅ Must emit events for every major action
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';

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
 * Planning Document Interface
 */
export interface PlanningDoc {
  id: string;
  appRequestId: string;
  type: DocumentTypeValue;
  content: string;
  status: DocumentStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * LLM Configuration
 */
interface LLMConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Product Strategist Agent
 *
 * Second AI-backed agent in Forge.
 * Generates strategic planning documents from approved Base Prompt.
 */
export class ProductStrategist {
  private llmConfig: LLMConfig;

  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: FastifyBaseLogger,
    config?: Partial<LLMConfig>
  ) {
    this.llmConfig = {
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
      model: config?.model || 'gpt-4o',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens || 2000,
    };

    this.logger.info('ProductStrategist initialized with LLM config');
  }

  /**
   * Start planning process
   *
   * Rules:
   * - Validates Conductor state = base_prompt_ready
   * - Locks Conductor
   * - Generates Master Plan via LLM
   * - Saves document with status = awaiting_approval
   * - Pauses Conductor for human approval
   * - Emits event: planning_document_created
   *
   * @throws Error if Conductor not in base_prompt_ready state
   * @throws Error if Base Prompt artifact not found
   */
  async start(appRequestId: string): Promise<PlanningDoc> {
    this.logger.info({ appRequestId }, 'Starting Product Strategist');

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'base_prompt_ready') {
      throw new Error(
        `Cannot start Product Strategist: Conductor state is '${state.currentStatus}', expected 'base_prompt_ready'`
      );
    }

    this.logger.debug({ appRequestId, state: state.currentStatus }, 'Conductor state validated');

    // Get Base Prompt artifact
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
      include: {
        project: {
          include: {
            artifacts: {
              where: {
                type: 'base_prompt',
                path: 'base_prompt.md',
              },
            },
          },
        },
      },
    });

    if (!appRequest) {
      throw new Error(`AppRequest not found: ${appRequestId}`);
    }

    const basePromptArtifact = appRequest.project.artifacts[0];
    if (!basePromptArtifact) {
      throw new Error(`Base Prompt artifact not found for appRequestId: ${appRequestId}`);
    }

    this.logger.debug(
      { appRequestId, artifactId: basePromptArtifact.id },
      'Base Prompt artifact retrieved'
    );

    // Read Base Prompt content (stored in path)
    const basePromptContent = await this.readArtifactContent(basePromptArtifact.path);

    this.logger.info({ appRequestId, contentLength: basePromptContent.length }, 'Base Prompt loaded');

    // Lock Conductor
    await this.conductor.lock(appRequestId);
    this.logger.debug({ appRequestId }, 'Conductor locked');

    // Emit planning_started event
    await this.emitEvent(appRequestId, 'planning_started', 'Product Strategist initiated');

    // Generate Master Plan
    const masterPlanContent = await this.generateMasterPlan(basePromptContent);

    this.logger.info(
      { appRequestId, contentLength: masterPlanContent.length },
      'Master Plan generated by LLM'
    );

    // Save document
    const document = await this.prisma.planningDocument.create({
      data: {
        id: randomUUID(),
        appRequestId,
        type: DocumentType.MASTER_PLAN,
        content: masterPlanContent,
        status: DocumentStatus.AWAITING_APPROVAL,
      },
    });

    this.logger.info(
      { appRequestId, documentId: document.id, type: document.type },
      'Master Plan saved to database'
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

    return this.toPlanningDoc(document);
  }

  /**
   * Approve a planning document
   *
   * Rules:
   * - Marks document as approved
   * - Emits event: planning_document_approved
   * - If MASTER_PLAN approved:
   *   - Generate Implementation Plan
   *   - Save with status = awaiting_approval
   *   - Pause Conductor again
   * - If IMPLEMENTATION_PLAN approved:
   *   - Transition Conductor: base_prompt_ready → planning
   *   - Unlock Conductor
   *
   * @throws Error if document not found
   * @throws Error if document not in awaiting_approval status
   */
  async approveDocument(
    appRequestId: string,
    documentType: DocumentTypeValue
  ): Promise<PlanningDoc | null> {
    this.logger.info({ appRequestId, documentType }, 'Approving planning document');

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

    // Mark as approved
    const approvedDocument = await this.prisma.planningDocument.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      { appRequestId, documentId: document.id, type: documentType },
      'Document approved'
    );

    // Emit planning_document_approved event
    await this.emitEvent(
      appRequestId,
      'planning_document_approved',
      `${documentType} approved by human`
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Handle next steps based on document type
    if (documentType === DocumentType.MASTER_PLAN) {
      this.logger.info({ appRequestId }, 'Master Plan approved - generating Implementation Plan');

      // Lock Conductor again
      await this.conductor.lock(appRequestId);

      // Get Base Prompt for context
      const basePrompt = await this.getBasePrompt(appRequestId);
      const masterPlan = approvedDocument.content;

      // Generate Implementation Plan
      const implementationPlanContent = await this.generateImplementationPlan(
        basePrompt,
        masterPlan
      );

      this.logger.info(
        { appRequestId, contentLength: implementationPlanContent.length },
        'Implementation Plan generated by LLM'
      );

      // Save Implementation Plan
      const implPlanDoc = await this.prisma.planningDocument.create({
        data: {
          id: randomUUID(),
          appRequestId,
          type: DocumentType.IMPLEMENTATION_PLAN,
          content: implementationPlanContent,
          status: DocumentStatus.AWAITING_APPROVAL,
        },
      });

      this.logger.info(
        { appRequestId, documentId: implPlanDoc.id },
        'Implementation Plan saved to database'
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

      return this.toPlanningDoc(implPlanDoc);
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
        'All planning documents approved - ready for architecture'
      );

      return this.toPlanningDoc(approvedDocument);
    }

    return null;
  }

  /**
   * Reject a planning document
   *
   * Rules:
   * - Deletes draft document
   * - Emits event: planning_document_rejected
   * - Unlocks Conductor
   * - Allows regeneration of the same document
   *
   * @throws Error if document not found
   */
  async rejectDocument(
    appRequestId: string,
    documentType: DocumentTypeValue,
    feedback?: string
  ): Promise<void> {
    this.logger.info({ appRequestId, documentType, feedback }, 'Rejecting planning document');

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

    // Delete document
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
   * Get current planning document
   *
   * Returns the latest document (any status) or null if none exists.
   */
  async getCurrentDocument(appRequestId: string): Promise<PlanningDoc | null> {
    const document = await this.prisma.planningDocument.findFirst({
      where: { appRequestId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!document) {
      return null;
    }

    return this.toPlanningDoc(document);
  }

  /**
   * Get all planning documents for an app request
   */
  async getAllDocuments(appRequestId: string): Promise<PlanningDoc[]> {
    const documents = await this.prisma.planningDocument.findMany({
      where: { appRequestId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return documents.map(doc => this.toPlanningDoc(doc));
  }

  /**
   * Generate Master Plan via LLM
   *
   * Input: Base Prompt (approved)
   * Output: Master Plan (Markdown)
   *
   * Must include:
   * - Vision
   * - Target audience
   * - Core problem
   * - Core modules (high-level, not features)
   * - Success criteria (measurable, realistic)
   *
   * Must NOT:
   * - Generate code
   * - Generate UI/screens
   * - Invent features not implied by Base Prompt
   *
   * @private
   */
  private async generateMasterPlan(basePrompt: string): Promise<string> {
    const systemPrompt = `You are a senior product strategist creating a Master Plan document.

Your job is to analyze the Base Prompt and create a strategic product plan.

Rules:
- NO code generation
- NO UI/screen designs
- NO implementation details
- Focus on WHAT and WHY, not HOW
- Be concise but comprehensive
- Only include what's implied by the Base Prompt

Required sections:
1. Vision - What is this product trying to achieve?
2. Target Audience - Who is this for?
3. Core Problem - What problem does it solve?
4. Core Modules - High-level functional areas (not features)
5. Success Criteria - Measurable, realistic goals

Format: Markdown with clear headings.`;

    const userPrompt = `Base Prompt:

${basePrompt}

---

Generate a Master Plan for this product.`;

    this.logger.debug({ basePromptLength: basePrompt.length }, 'Generating Master Plan via LLM');

    return await this.callLLM(systemPrompt, userPrompt);
  }

  /**
   * Generate Implementation Plan via LLM
   *
   * Input: Base Prompt + Master Plan (both approved)
   * Output: Implementation Plan (Markdown)
   *
   * Must include:
   * - Recommended tech stack (respects Base Prompt preferences)
   * - Development phases (Phase 1, Phase 2, etc.)
   * - Feature sequencing (what comes before what)
   * - Timeline (ONLY if Base Prompt included one)
   *
   * Must NOT:
   * - Generate code
   * - Generate UI/screens
   * - Invent complex features
   *
   * @private
   */
  private async generateImplementationPlan(
    basePrompt: string,
    masterPlan: string
  ): Promise<string> {
    const systemPrompt = `You are a senior product strategist creating an Implementation Plan.

Your job is to create a phased implementation strategy.

Rules:
- NO code generation
- NO UI/screen designs
- Respect tech preferences in Base Prompt
- Focus on SEQUENCING and PRIORITIZATION
- Be realistic about complexity
- Only include what's implied by the Base Prompt and Master Plan

Required sections:
1. Recommended Tech Stack - Respect Base Prompt preferences
2. Development Phases - Phase 1, Phase 2, etc. with clear goals
3. Feature Sequencing - What must be built first, dependencies
4. Timeline - ONLY if Base Prompt mentioned timeline constraints

Format: Markdown with clear headings.`;

    const userPrompt = `Base Prompt:

${basePrompt}

---

Master Plan:

${masterPlan}

---

Generate an Implementation Plan for this product.`;

    this.logger.debug(
      { basePromptLength: basePrompt.length, masterPlanLength: masterPlan.length },
      'Generating Implementation Plan via LLM'
    );

    return await this.callLLM(systemPrompt, userPrompt);
  }

  /**
   * Call LLM (OpenAI API)
   *
   * @private
   */
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.llmConfig.apiKey) {
      this.logger.warn('LLM API key not configured - using fallback mode');
      return this.generateFallbackPlan(userPrompt);
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
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const message = data.choices?.[0]?.message?.content as string | undefined;

    if (!message) {
      throw new Error('No response from LLM API');
    }

    return message;
  }

  /**
   * Generate fallback plan when LLM is not available
   *
   * @private
   */
  private generateFallbackPlan(prompt: string): string {
    const isMasterPlan = prompt.includes('Master Plan');

    if (isMasterPlan) {
      return `# Master Plan

## Vision

Build a modern, user-friendly application that solves core productivity challenges.

## Target Audience

Professionals and teams seeking better tools for organization and collaboration.

## Core Problem

Current solutions are either too complex, too expensive, or lack key features needed for modern workflows.

## Core Modules

- User Management - Authentication, profiles, permissions
- Core Functionality - Primary feature set as defined in Base Prompt
- Collaboration - Team features, sharing, notifications
- Settings & Configuration - User preferences, customization

## Success Criteria

- User adoption: 100+ active users in first 3 months
- User satisfaction: 4+ star average rating
- Performance: Page load < 2 seconds
- Reliability: 99%+ uptime
`;
    } else {
      return `# Implementation Plan

## Recommended Tech Stack

- Frontend: React with TypeScript
- Backend: Node.js with Fastify
- Database: PostgreSQL
- Deployment: Docker containers
- CI/CD: GitHub Actions

## Development Phases

### Phase 1 - Foundation (Weeks 1-2)
- Set up project structure
- Implement authentication
- Create basic UI framework
- Database schema design

### Phase 2 - Core Features (Weeks 3-4)
- Implement primary features from Base Prompt
- Build main user workflows
- Add validation and error handling

### Phase 3 - Polish (Weeks 5-6)
- UI/UX refinement
- Performance optimization
- Testing and bug fixes
- Documentation

## Feature Sequencing

1. Authentication (required first)
2. Core data models
3. Primary user workflows
4. Team/collaboration features
5. Advanced features
6. Notifications and integrations

## Timeline

Total estimated time: 6 weeks for MVP
Additional 2-4 weeks for production hardening
`;
    }
  }

  /**
   * Get Base Prompt content
   *
   * @private
   */
  private async getBasePrompt(appRequestId: string): Promise<string> {
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
      include: {
        project: {
          include: {
            artifacts: {
              where: {
                type: 'base_prompt',
                path: 'base_prompt.md',
              },
            },
          },
        },
      },
    });

    if (!appRequest) {
      throw new Error(`AppRequest not found: ${appRequestId}`);
    }

    const artifact = appRequest.project.artifacts[0];
    if (!artifact) {
      throw new Error(`Base Prompt artifact not found for appRequestId: ${appRequestId}`);
    }

    return await this.readArtifactContent(artifact.path);
  }

  /**
   * Read artifact content from file system
   *
   * @private
   */
  private async readArtifactContent(path: string): Promise<string> {
    // For now, we'll simulate reading from the path
    // In production, this would read from actual file system or object storage
    // For testing, we return a placeholder that tests can override
    return `Base Prompt Content (path: ${path})`;
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
  private toPlanningDoc(doc: any): PlanningDoc {
    return {
      id: doc.id,
      appRequestId: doc.appRequestId,
      type: doc.type as DocumentTypeValue,
      content: doc.content,
      status: doc.status as DocumentStatusValue,
      createdAt: doc.createdAt,
      approvedAt: doc.approvedAt,
    };
  }
}
