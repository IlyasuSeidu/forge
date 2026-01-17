/**
 * Screen Cartographer Agent
 *
 * Tier 2 - Product & Strategy Agent (AI-powered)
 *
 * Purpose:
 * Defines the complete surface area of the application:
 * - What screens/pages exist
 * - What each screen is responsible for
 * - What actions and logic live on each screen
 *
 * This agent defines WHAT pages exist and WHAT they do, not HOW they are implemented.
 *
 * Two-Phase Process:
 * 1. Screen Index - Complete list of screen titles (global, approved once)
 * 2. Screen Descriptions - Detailed description of each screen (one-by-one, approved individually)
 *
 * Critical Rules:
 * - ❌ Must NOT generate UI components
 * - ❌ Must NOT generate code
 * - ❌ Must NOT generate flows or user journeys
 * - ❌ Must NOT generate mockups or images
 * - ❌ Must NOT advance Conductor without human approval
 * - ❌ Must NOT run unless state = planning
 * - ❌ Must NOT describe screens before index is approved
 * - ❌ Must NOT invent screens not implied by planning docs
 * - ✅ Uses LLM (GPT-5)
 * - ✅ One responsibility: screens
 * - ✅ Everything stored durably in DB
 * - ✅ Human confirmation mandatory at every phase
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';

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
 * Screen Index Interface
 */
export interface ScreenIndexData {
  id: string;
  appRequestId: string;
  screens: string[]; // Array of screen names
  status: ScreenStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * Screen Definition Interface
 */
export interface ScreenDefinitionData {
  id: string;
  appRequestId: string;
  screenName: string;
  content: string; // Markdown
  order: number;
  status: ScreenStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * Current State Interface
 */
export interface CartographerState {
  indexStatus: ScreenStatusValue | null;
  totalScreens: number;
  currentScreen: ScreenDefinitionData | null;
  completedCount: number;
  remainingCount: number;
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
 * Screen Cartographer Agent
 *
 * Third AI-backed agent in Forge.
 * Maps the complete surface area of the application.
 */
export class ScreenCartographer {
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

    this.logger.info('ScreenCartographer initialized with LLM config');
  }

  /**
   * Start screen cartography process (Phase 1: Screen Index)
   *
   * Rules:
   * - Validates Conductor state = planning
   * - Locks Conductor
   * - Generates Screen Index via LLM (titles only)
   * - Saves with status = awaiting_approval
   * - Pauses Conductor for human approval
   * - Emits event: screen_index_created
   *
   * @throws Error if Conductor not in planning state
   * @throws Error if planning documents not found
   * @throws Error if screen index already exists
   */
  async start(appRequestId: string): Promise<ScreenIndexData> {
    this.logger.info({ appRequestId }, 'Starting Screen Cartographer');

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

    // Get planning documents
    const { basePrompt, masterPlan, implPlan } = await this.getPlanningContext(appRequestId);

    this.logger.info(
      {
        appRequestId,
        basePromptLength: basePrompt.length,
        masterPlanLength: masterPlan.length,
        implPlanLength: implPlan.length,
      },
      'Planning context loaded'
    );

    // Lock Conductor
    await this.conductor.lock(appRequestId);
    this.logger.debug({ appRequestId }, 'Conductor locked');

    // Generate Screen Index
    const screenList = await this.generateScreenIndex(basePrompt, masterPlan, implPlan);

    this.logger.info(
      { appRequestId, screenCount: screenList.length },
      'Screen Index generated by LLM'
    );

    // Save Screen Index
    const screenIndex = await this.prisma.screenIndex.create({
      data: {
        id: randomUUID(),
        appRequestId,
        screens: JSON.stringify(screenList),
        status: ScreenStatus.AWAITING_APPROVAL,
      },
    });

    this.logger.info(
      { appRequestId, screenIndexId: screenIndex.id, screenCount: screenList.length },
      'Screen Index saved to database'
    );

    // Emit screen_index_created event
    await this.emitEvent(
      appRequestId,
      'screen_index_created',
      `Screen Index created with ${screenList.length} screens - awaiting approval`
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(
      appRequestId,
      'Screen Index generated - awaiting human approval'
    );

    this.logger.info({ appRequestId }, 'Conductor paused for human approval');

    // Unlock Conductor (paused but not locked)
    await this.conductor.unlock(appRequestId);

    return this.toScreenIndexData(screenIndex);
  }

  /**
   * Approve Screen Index
   *
   * Rules:
   * - Marks index as approved
   * - Emits event: screen_index_approved
   * - Prepares for first screen description
   * - Unlocks Conductor
   *
   * @throws Error if screen index not found
   * @throws Error if index not in awaiting_approval status
   */
  async approveScreenIndex(appRequestId: string): Promise<ScreenIndexData> {
    this.logger.info({ appRequestId }, 'Approving Screen Index');

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

    // Mark as approved
    const approved = await this.prisma.screenIndex.update({
      where: { id: screenIndex.id },
      data: {
        status: ScreenStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info({ appRequestId, screenIndexId: approved.id }, 'Screen Index approved');

    // Emit screen_index_approved event
    await this.emitEvent(
      appRequestId,
      'screen_index_approved',
      'Screen Index approved by human - ready for screen descriptions'
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info({ appRequestId }, 'Ready for first screen description');

    return this.toScreenIndexData(approved);
  }

  /**
   * Describe next screen (Phase 2: Sequential Screen Descriptions)
   *
   * Rules:
   * - Finds next screen by order
   * - Generates detailed screen description
   * - Saves as awaiting_approval
   * - Locks & pauses Conductor
   * - Emits screen_description_created
   *
   * Important:
   * - Only one screen may be described at a time
   * - Must pause for approval after each screen
   *
   * @throws Error if screen index not approved
   * @throws Error if no more screens to describe
   */
  async describeNextScreen(appRequestId: string): Promise<ScreenDefinitionData> {
    this.logger.info({ appRequestId }, 'Describing next screen');

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

    // Get planning context
    const { basePrompt, masterPlan, implPlan } = await this.getPlanningContext(appRequestId);

    // Lock Conductor
    await this.conductor.lock(appRequestId);

    // Generate screen description
    const description = await this.generateScreenDescription(
      screenName!,
      screenList,
      basePrompt,
      masterPlan,
      implPlan
    );

    this.logger.info(
      { appRequestId, screenName, contentLength: description.length },
      'Screen description generated by LLM'
    );

    // Save screen definition
    const screenDef = await this.prisma.screenDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId,
        screenName: screenName!,
        content: description,
        order: nextOrder,
        status: ScreenStatus.AWAITING_APPROVAL,
      },
    });

    this.logger.info(
      { appRequestId, screenDefId: screenDef.id, screenName, order: nextOrder },
      'Screen definition saved to database'
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

    return this.toScreenDefinitionData(screenDef);
  }

  /**
   * Approve current screen
   *
   * Rules:
   * - Marks current screen as approved
   * - Emits screen_description_approved
   * - Unlocks Conductor
   * - If more screens remain → ready for next
   * - If all screens approved → transition Conductor to screens_defined
   *
   * @throws Error if no screen awaiting approval
   */
  async approveCurrentScreen(appRequestId: string): Promise<ScreenDefinitionData> {
    this.logger.info({ appRequestId }, 'Approving current screen');

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

    // Mark as approved
    const approved = await this.prisma.screenDefinition.update({
      where: { id: currentScreen.id },
      data: {
        status: ScreenStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      { appRequestId, screenDefId: approved.id, screenName: approved.screenName },
      'Screen approved'
    );

    // Emit screen_description_approved event
    await this.emitEvent(
      appRequestId,
      'screen_description_approved',
      `Screen "${approved.screenName}" approved by human`
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

    return this.toScreenDefinitionData(approved);
  }

  /**
   * Reject current screen
   *
   * Rules:
   * - Deletes current draft
   * - Emits screen_description_rejected
   * - Unlocks Conductor
   * - Allows regeneration
   *
   * @throws Error if no screen awaiting approval
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
   * Get current cartographer state
   *
   * Returns comprehensive state information including:
   * - Screen Index status
   * - Current screen (if any)
   * - Progress (completed/remaining)
   */
  async getCurrentState(appRequestId: string): Promise<CartographerState> {
    // Get screen index
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      return {
        indexStatus: null,
        totalScreens: 0,
        currentScreen: null,
        completedCount: 0,
        remainingCount: 0,
      };
    }

    const screenList: string[] = JSON.parse(screenIndex.screens);
    const totalScreens = screenList.length;

    // Get current screen (awaiting approval)
    const currentScreen = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        status: ScreenStatus.AWAITING_APPROVAL,
      },
      orderBy: {
        order: 'desc',
      },
    });

    // Get approved count
    const completedCount = await this.prisma.screenDefinition.count({
      where: {
        appRequestId,
        status: ScreenStatus.APPROVED,
      },
    });

    return {
      indexStatus: screenIndex.status as ScreenStatusValue,
      totalScreens,
      currentScreen: currentScreen ? this.toScreenDefinitionData(currentScreen) : null,
      completedCount,
      remainingCount: totalScreens - completedCount - (currentScreen ? 1 : 0),
    };
  }

  /**
   * Generate Screen Index via LLM
   *
   * Input: Base Prompt + Planning Docs
   * Output: Array of screen names (titles only)
   *
   * Rules:
   * - Titles only (no descriptions)
   * - Must be exhaustive
   * - Must align with planning docs
   * - Must include auth & edge screens if implied
   *
   * Must NOT:
   * - Generate code
   * - Generate UI/mockups
   * - Invent screens not implied by planning
   *
   * @private
   */
  private async generateScreenIndex(
    basePrompt: string,
    masterPlan: string,
    implPlan: string
  ): Promise<string[]> {
    const systemPrompt = `You are a senior product/UX architect generating a Screen Index.

Your job is to enumerate ALL screens/pages that must exist in this application.

Rules:
- Titles only (no descriptions yet)
- Must be exhaustive and complete
- Must align with planning documents
- Include auth screens (login, signup) if implied
- Include edge/utility screens (settings, profile, 404, etc.)
- NO code, NO UI design, NO mockups
- DO NOT invent features not implied by the planning docs

Output format:
Return a JSON array of screen names as strings.
Example: ["Landing Page", "Sign Up", "Login", "Dashboard", "Settings"]

Be precise and exhaustive.`;

    const userPrompt = `Base Prompt:

${basePrompt}

---

Master Plan:

${masterPlan}

---

Implementation Plan:

${implPlan}

---

Generate a complete Screen Index (array of screen names only).`;

    this.logger.debug(
      {
        basePromptLength: basePrompt.length,
        masterPlanLength: masterPlan.length,
        implPlanLength: implPlan.length,
      },
      'Generating Screen Index via LLM'
    );

    const response = await this.callLLM(systemPrompt, userPrompt);

    // Parse JSON response
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in LLM response');
      }

      const screenList = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(screenList) || screenList.length === 0) {
        throw new Error('Invalid screen list: must be non-empty array');
      }

      return screenList;
    } catch (error) {
      this.logger.error({ error, response }, 'Failed to parse Screen Index from LLM');
      throw new Error(`Failed to parse Screen Index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Screen Description via LLM
   *
   * Input: Screen name + Context
   * Output: Detailed Markdown description
   *
   * Must include:
   * - Purpose
   * - User role access
   * - Layout structure
   * - Functional logic
   * - Key UI elements
   * - Special behaviors
   *
   * Navigation rule:
   * - If screen is Home/Dashboard, mention Top nav (web) / Bottom tab nav (mobile)
   *
   * Must NOT:
   * - Generate code
   * - Generate UI/mockups
   * - Define flows or journeys
   *
   * @private
   */
  private async generateScreenDescription(
    screenName: string,
    allScreens: string[],
    basePrompt: string,
    masterPlan: string,
    implPlan: string
  ): Promise<string> {
    const systemPrompt = `You are a senior product/UX architect generating a detailed Screen Description.

Your job is to describe ONE screen in deep detail.

Required sections:
1. Purpose - What is this screen for?
2. User Role Access - Who can access this screen?
3. Layout Structure - Headers, navs, sections (high-level)
4. Functional Logic - What actions/operations are available?
5. Key UI Elements - Buttons, forms, filters, lists (conceptual, not code)
6. Special Behaviors - Modals, animations, role-based visibility

Navigation rules:
- If screen is "Home" or "Dashboard":
  - Mention Top navigation bar (web)
  - Mention Bottom tab navigation (mobile)

Rules:
- NO code generation
- NO UI mockups or images
- NO flows or user journeys
- Focus on WHAT this screen does, not HOW it's implemented
- Be specific but stay conceptual

Output format: Markdown with clear headings.`;

    const userPrompt = `Base Prompt:

${basePrompt}

---

Master Plan:

${masterPlan}

---

Implementation Plan:

${implPlan}

---

All Screens:
${allScreens.map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

Generate a detailed description for: **${screenName}**`;

    this.logger.debug(
      {
        screenName,
        allScreensCount: allScreens.length,
        basePromptLength: basePrompt.length,
      },
      'Generating screen description via LLM'
    );

    return await this.callLLM(systemPrompt, userPrompt);
  }

  /**
   * Get planning context (Base Prompt + Planning Docs)
   *
   * @private
   */
  private async getPlanningContext(
    appRequestId: string
  ): Promise<{ basePrompt: string; masterPlan: string; implPlan: string }> {
    // Get planning documents
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

    // Get Base Prompt (from artifact)
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
      throw new Error('Base Prompt artifact not found');
    }

    // For now, return placeholder (in production would read from file system)
    const basePrompt = `Base Prompt (path: ${artifact.path})`;

    return {
      basePrompt,
      masterPlan: masterPlan.content,
      implPlan: implPlan.content,
    };
  }

  /**
   * Call LLM (OpenAI API)
   *
   * @private
   */
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.llmConfig.apiKey) {
      this.logger.warn('LLM API key not configured - using fallback mode');
      return this.generateFallbackResponse(userPrompt);
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
   * Generate fallback response when LLM is not available
   *
   * @private
   */
  private generateFallbackResponse(prompt: string): string {
    const isScreenIndex = prompt.includes('Screen Index');

    if (isScreenIndex) {
      // Return fallback screen list
      return JSON.stringify([
        'Landing Page',
        'Sign Up',
        'Login',
        'Dashboard',
        'Task List',
        'Task Detail',
        'Settings',
      ]);
    } else {
      // Return fallback screen description
      const screenNameMatch = prompt.match(/\*\*(.+?)\*\*/);
      const screenName = screenNameMatch ? screenNameMatch[1] : 'Unknown Screen';

      return `# ${screenName}

## Purpose

This screen serves as a primary interface for users to interact with the core functionality of the application.

## User Role Access

All authenticated users can access this screen.

## Layout Structure

- Header with branding and navigation
- Main content area with primary functionality
- Footer with links and information

## Functional Logic

- Display relevant data to the user
- Allow user interactions (view, create, edit, delete)
- Provide feedback on actions

## Key UI Elements

- Navigation menu
- Primary action buttons
- Data display components (lists, grids, cards)
- Forms for data input

## Special Behaviors

- Loading states during data fetch
- Error messages for failed operations
- Success confirmations
`;
    }
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
  private toScreenIndexData(index: any): ScreenIndexData {
    return {
      id: index.id,
      appRequestId: index.appRequestId,
      screens: JSON.parse(index.screens),
      status: index.status as ScreenStatusValue,
      createdAt: index.createdAt,
      approvedAt: index.approvedAt,
    };
  }

  /**
   * Convert Prisma model to interface
   *
   * @private
   */
  private toScreenDefinitionData(def: any): ScreenDefinitionData {
    return {
      id: def.id,
      appRequestId: def.appRequestId,
      screenName: def.screenName,
      content: def.content,
      order: def.order,
      status: def.status as ScreenStatusValue,
      createdAt: def.createdAt,
      approvedAt: def.approvedAt,
    };
  }
}
