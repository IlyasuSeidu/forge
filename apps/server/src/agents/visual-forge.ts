/**
 * Visual Forge - Tier 3 UI Mockup Generation Agent
 *
 * Responsibilities:
 * - Generate high-fidelity UI mockups for each approved screen
 * - Ask human for layout type (mobile/desktop) before each mockup
 * - Use OpenAI image generation to create production-ready UI designs
 * - Store mockup images with metadata
 * - Enforce human approval for every mockup
 * - Transition Conductor from flows_defined → designs_ready
 *
 * HARD CONSTRAINTS:
 * - Cannot start unless Conductor = flows_defined
 * - Cannot invent screens or features
 * - Must follow Screen Cartographer definitions exactly
 * - Must ask for layout type before generating
 * - One mockup at a time with approval gates
 * - Lock/unlock discipline required
 * - Full event emission for observability
 *
 * Architecture:
 * - First visual-producing agent (Tier 3)
 * - Consumes all Tier 1 & 2 outputs (never reinterprets)
 * - Produces pixels, not code
 * - High-fidelity production-ready designs only
 */

import type { PrismaClient, ScreenMockup } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Mockup Status Constants
 */
const MockupStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

type MockupStatusValue = (typeof MockupStatus)[keyof typeof MockupStatus];

/**
 * Layout Type Constants
 */
const LayoutType = {
  MOBILE: 'mobile',
  DESKTOP: 'desktop',
} as const;

type LayoutTypeValue = (typeof LayoutType)[keyof typeof LayoutType];

/**
 * Screen Mockup Data Transfer Object
 */
export interface ScreenMockupData {
  id: string;
  appRequestId: string;
  screenName: string;
  layoutType: LayoutTypeValue;
  imagePath: string;
  promptMetadata: MockupPromptMetadata;
  status: MockupStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * Mockup Prompt Metadata
 */
export interface MockupPromptMetadata {
  screenDescription: string;
  userRoles: string[];
  layoutType: LayoutTypeValue;
  generatedPrompt: string;
}

/**
 * Current State Interface
 */
export interface ForgeState {
  totalScreens: number;
  currentMockup: ScreenMockupData | null;
  completedCount: number;
  remainingCount: number;
  allScreenNames: string[];
}

/**
 * LLM Configuration for OpenAI Image Generation
 */
interface LLMConfig {
  apiKey: string;
  model: string; // "dall-e-3"
  size: string; // "1024x1024" or "1792x1024"
  quality: string; // "hd"
}

/**
 * Visual Forge Agent
 *
 * Tier 3 agent responsible for generating high-fidelity UI mockups
 * based on approved screens from Screen Cartographer.
 */
export class VisualForge {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private llmConfig: LLMConfig;
  private mockupsDir: string;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;

    // LLM configuration (OpenAI for image generation)
    this.llmConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'dall-e-3',
      size: '1792x1024', // Wide format for desktop/mobile
      quality: 'hd',
    };

    // Mockups directory
    this.mockupsDir = path.join(process.cwd(), 'mockups');

    this.logger.info('VisualForge initialized with LLM config');
  }

  /**
   * Start Visual Forge mockup generation
   *
   * Rules:
   * - Conductor must be in flows_defined state
   * - Loads approved screens from Screen Cartographer
   * - Asks human for layout type before generating
   * - Locks Conductor during operation
   *
   * @throws Error if Conductor not in flows_defined state
   */
  async start(appRequestId: string): Promise<{ message: string; nextScreen: string }> {
    this.logger.info({ appRequestId }, 'Starting Visual Forge');

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'flows_defined') {
      throw new Error(
        `Cannot start Visual Forge: Conductor state is '${state.currentStatus}', expected 'flows_defined'`
      );
    }

    this.logger.debug({ appRequestId, state: 'flows_defined' }, 'Conductor state validated');

    // Load approved screens
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || screenIndex.status !== 'approved') {
      throw new Error(`No approved screen index found for appRequestId: ${appRequestId}`);
    }

    const allScreens: string[] = JSON.parse(screenIndex.screens);

    // Check if there are already mockups
    const existingMockups = await this.prisma.screenMockup.findMany({
      where: { appRequestId, status: MockupStatus.APPROVED },
    });

    const mockedScreenNames = new Set(existingMockups.map(m => m.screenName));
    const unmockedScreens = allScreens.filter(name => !mockedScreenNames.has(name));

    if (unmockedScreens.length === 0) {
      throw new Error('All screens already have approved mockups');
    }

    const nextScreen = unmockedScreens[0];

    this.logger.info(
      { appRequestId, nextScreen, totalScreens: allScreens.length, remaining: unmockedScreens.length },
      'Visual Forge ready - awaiting layout selection'
    );

    return {
      message: `Ready to mock "${nextScreen}". Please select layout type (mobile or desktop).`,
      nextScreen: nextScreen!,
    };
  }

  /**
   * Select layout type for current screen and generate mockup
   *
   * Rules:
   * - Human must choose mobile or desktop
   * - Locks Conductor
   * - Generates mockup via OpenAI
   * - Stores image and metadata
   * - Pauses for approval
   *
   * @throws Error if layout type invalid
   */
  async selectLayout(appRequestId: string, screenName: string, layoutType: LayoutTypeValue): Promise<ScreenMockupData> {
    this.logger.info({ appRequestId, screenName, layoutType }, 'Layout selected - generating mockup');

    // Validate layout type
    if (layoutType !== LayoutType.MOBILE && layoutType !== LayoutType.DESKTOP) {
      throw new Error(`Invalid layout type: ${layoutType}. Must be 'mobile' or 'desktop'`);
    }

    // Check if mockup already exists for this screen (and delete draft if exists)
    const existingDraft = await this.prisma.screenMockup.findFirst({
      where: {
        appRequestId,
        screenName,
        status: MockupStatus.AWAITING_APPROVAL,
      },
    });

    if (existingDraft) {
      throw new Error(`Mockup for "${screenName}" already awaiting approval`);
    }

    // Lock Conductor
    await this.conductor.lock(appRequestId);

    try {
      // Load context
      const context = await this.loadDesignContext(appRequestId, screenName);

      // Generate mockup
      const mockup = await this.generateMockupImage(appRequestId, screenName, layoutType, context);

      // Pause Conductor for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        `UI mockup for "${screenName}" (${layoutType}) generated - awaiting human approval`
      );

      this.logger.info({ appRequestId, screenName }, 'Conductor paused for mockup approval');

      // Unlock Conductor
      await this.conductor.unlock(appRequestId);

      return mockup;
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      throw error;
    }
  }

  /**
   * Approve current mockup
   *
   * Rules:
   * - Marks mockup as approved
   * - Emits mockup_approved event
   * - Resumes Conductor
   * - If all mockups approved → transition to designs_ready
   *
   * @throws Error if no mockup awaiting approval
   */
  async approveMockup(appRequestId: string, screenName: string): Promise<ScreenMockupData> {
    this.logger.info({ appRequestId, screenName }, 'Approving mockup');

    // Get current mockup
    const mockup = await this.prisma.screenMockup.findFirst({
      where: {
        appRequestId,
        screenName,
        status: MockupStatus.AWAITING_APPROVAL,
      },
    });

    if (!mockup) {
      throw new Error(`No mockup awaiting approval for screen: ${screenName}`);
    }

    // Mark as approved
    const approved = await this.prisma.screenMockup.update({
      where: { id: mockup.id },
      data: {
        status: MockupStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info({ appRequestId, mockupId: approved.id, screenName }, 'Mockup approved');

    // Emit mockup_approved event
    await this.emitEvent(appRequestId, 'mockup_approved', `UI mockup for "${screenName}" approved by human`);

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Check if all mockups are approved
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error(`Screen index not found for appRequestId: ${appRequestId}`);
    }

    const allScreens: string[] = JSON.parse(screenIndex.screens);
    const totalScreens = allScreens.length;

    const approvedMockups = await this.prisma.screenMockup.count({
      where: {
        appRequestId,
        status: MockupStatus.APPROVED,
      },
    });

    this.logger.debug({ appRequestId, approvedMockups, totalScreens }, 'Mockup approval progress');

    if (approvedMockups === totalScreens) {
      this.logger.info({ appRequestId }, 'All mockups approved - transitioning to designs_ready');

      // Transition Conductor to designs_ready
      await this.conductor.transition(appRequestId, 'designs_ready', 'VisualForge');

      this.logger.info({ appRequestId, newStatus: 'designs_ready' }, 'Conductor transitioned to designs_ready');

      // Emit designs_ready event
      await this.emitEvent(
        appRequestId,
        'designs_ready',
        `All ${totalScreens} UI mockups defined and approved - ready for component generation`
      );
    } else {
      this.logger.info(
        { appRequestId, remainingMockups: totalScreens - approvedMockups },
        'Ready for next mockup'
      );
    }

    return this.toMockupData(approved);
  }

  /**
   * Reject current mockup
   *
   * Rules:
   * - Deletes mockup and image file
   * - Emits mockup_rejected event
   * - Unlocks Conductor (allows regeneration)
   * - Does NOT advance Conductor
   *
   * @param feedback Optional feedback for regeneration
   */
  async rejectMockup(appRequestId: string, screenName: string, feedback?: string): Promise<void> {
    this.logger.info({ appRequestId, screenName, feedback }, 'Rejecting mockup');

    // Get current mockup
    const mockup = await this.prisma.screenMockup.findFirst({
      where: {
        appRequestId,
        screenName,
        status: MockupStatus.AWAITING_APPROVAL,
      },
    });

    if (!mockup) {
      throw new Error(`No mockup awaiting approval for screen: ${screenName}`);
    }

    // Delete image file
    try {
      await fs.unlink(mockup.imagePath);
      this.logger.debug({ imagePath: mockup.imagePath }, 'Mockup image file deleted');
    } catch (error) {
      this.logger.warn({ imagePath: mockup.imagePath, error }, 'Failed to delete mockup image file');
    }

    // Delete mockup from database
    await this.prisma.screenMockup.delete({
      where: { id: mockup.id },
    });

    this.logger.info({ appRequestId, mockupId: mockup.id, screenName }, 'Mockup deleted');

    // Emit mockup_rejected event
    await this.emitEvent(
      appRequestId,
      'mockup_rejected',
      `UI mockup for "${screenName}" rejected by human${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor (ready for regeneration)
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Conductor unlocked - ready for regeneration');
  }

  /**
   * Get current Visual Forge state
   *
   * Returns comprehensive state information including:
   * - Total screens
   * - Current mockup (if any)
   * - Progress (completed/remaining)
   * - All screen names
   */
  async getCurrentState(appRequestId: string): Promise<ForgeState> {
    // Get screen index
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      return {
        totalScreens: 0,
        currentMockup: null,
        completedCount: 0,
        remainingCount: 0,
        allScreenNames: [],
      };
    }

    const allScreenNames: string[] = JSON.parse(screenIndex.screens);
    const totalScreens = allScreenNames.length;

    // Get current mockup (awaiting approval)
    const currentMockup = await this.prisma.screenMockup.findFirst({
      where: {
        appRequestId,
        status: MockupStatus.AWAITING_APPROVAL,
      },
    });

    // Get approved count
    const completedCount = await this.prisma.screenMockup.count({
      where: {
        appRequestId,
        status: MockupStatus.APPROVED,
      },
    });

    return {
      totalScreens,
      currentMockup: currentMockup ? this.toMockupData(currentMockup) : null,
      completedCount,
      remainingCount: totalScreens - completedCount - (currentMockup ? 1 : 0),
      allScreenNames,
    };
  }

  /**
   * Generate UI mockup image via OpenAI DALL-E
   *
   * Input: Screen context (description, roles, journeys)
   * Output: High-fidelity UI mockup image
   *
   * Rules:
   * - Production-ready design (not wireframes)
   * - Matches screen description exactly
   * - Respects role-based visibility
   * - Modern, clean UI patterns
   * - Proper layout for mobile/desktop
   *
   * @private
   */
  private async generateMockupImage(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutTypeValue,
    context: {
      screenDescription: string;
      basePrompt: string;
      userRoles: string[];
      relevantJourneys: string[];
    }
  ): Promise<ScreenMockupData> {
    this.logger.debug(
      { screenName, layoutType, contextLength: context.screenDescription.length },
      'Generating mockup via LLM'
    );

    // Build prompt for image generation
    const imagePrompt = this.buildImagePrompt(screenName, layoutType, context);

    let imagePath = '';
    const mockupId = randomUUID();

    // Check if LLM is configured
    if (!this.llmConfig.apiKey) {
      this.logger.warn('OpenAI API key not configured - using fallback mode');

      // Fallback: Create placeholder image path (for testing)
      const filename = `${screenName.toLowerCase().replace(/\s+/g, '-')}-${layoutType}.png`;
      imagePath = path.join(this.mockupsDir, filename);

      // Ensure mockups directory exists
      await fs.mkdir(this.mockupsDir, { recursive: true });

      // Create empty file (in real mode, this would be the actual generated image)
      await fs.writeFile(imagePath, 'PLACEHOLDER_IMAGE_DATA');
    } else {
      // Real mode: Call OpenAI DALL-E API
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.llmConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: this.llmConfig.model,
            prompt: imagePrompt,
            n: 1,
            size: this.llmConfig.size,
            quality: this.llmConfig.quality,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json() as any;
        const imageUrl = data.data[0].url as string;

        // Download image
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Save image
        const filename = `${screenName.toLowerCase().replace(/\s+/g, '-')}-${layoutType}.png`;
        imagePath = path.join(this.mockupsDir, filename);

        await fs.mkdir(this.mockupsDir, { recursive: true });
        await fs.writeFile(imagePath, imageBuffer);

        this.logger.info({ imagePath, screenName }, 'Mockup image downloaded and saved');
      } catch (error) {
        this.logger.error({ error, screenName }, 'Failed to generate mockup via OpenAI');
        throw new Error(`Failed to generate mockup: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Save mockup to database
    const promptMetadata: MockupPromptMetadata = {
      screenDescription: context.screenDescription,
      userRoles: context.userRoles,
      layoutType,
      generatedPrompt: imagePrompt,
    };

    const mockup = await this.prisma.screenMockup.create({
      data: {
        id: mockupId,
        appRequestId,
        screenName,
        layoutType,
        imagePath,
        promptMetadata: JSON.stringify(promptMetadata),
        status: MockupStatus.AWAITING_APPROVAL,
      },
    });

    this.logger.info({ appRequestId, mockupId, screenName, layoutType }, 'Mockup saved to database');

    // Emit mockup_generated event
    await this.emitEvent(
      appRequestId,
      'mockup_generated',
      `UI mockup for "${screenName}" (${layoutType}) generated - awaiting approval`
    );

    return this.toMockupData(mockup);
  }

  /**
   * Load design context for mockup generation
   *
   * Loads:
   * - Base prompt
   * - Screen description
   * - User roles
   * - Relevant user journeys
   *
   * @private
   */
  private async loadDesignContext(
    appRequestId: string,
    screenName: string
  ): Promise<{
    screenDescription: string;
    basePrompt: string;
    userRoles: string[];
    relevantJourneys: string[];
  }> {
    // Load screen description
    const screenDef = await this.prisma.screenDefinition.findFirst({
      where: { appRequestId, screenName },
    });

    if (!screenDef || screenDef.status !== 'approved') {
      throw new Error(`No approved screen definition found for: ${screenName}`);
    }

    // Load base prompt
    const basePromptArtifact = await this.prisma.artifact.findFirst({
      where: {
        projectId: (await this.prisma.appRequest.findUnique({ where: { id: appRequestId } }))?.projectId,
        type: 'base_prompt',
      },
    });

    const basePrompt = basePromptArtifact?.path || '';

    // Load user roles
    const rolesDef = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    const userRoles = rolesDef ? this.extractRoleNamesFromTable(rolesDef.content) : [];

    // Load relevant user journeys (journeys that mention this screen)
    const journeys = await this.prisma.userJourney.findMany({
      where: {
        appRequestId,
        status: 'approved',
      },
    });

    const relevantJourneys = journeys
      .filter(j => j.content.toLowerCase().includes(screenName.toLowerCase()))
      .map(j => `${j.roleName}: ${j.content}`);

    this.logger.info(
      { appRequestId, screenName, rolesCount: userRoles.length, journeysCount: relevantJourneys.length },
      'Design context loaded'
    );

    return {
      screenDescription: screenDef.content,
      basePrompt,
      userRoles,
      relevantJourneys,
    };
  }

  /**
   * Build image generation prompt
   *
   * Constructs detailed prompt for DALL-E to generate high-fidelity UI mockup
   *
   * @private
   */
  private buildImagePrompt(
    screenName: string,
    layoutType: LayoutTypeValue,
    context: {
      screenDescription: string;
      basePrompt: string;
      userRoles: string[];
      relevantJourneys: string[];
    }
  ): string {
    const deviceSpec = layoutType === LayoutType.MOBILE ? 'iPhone mobile app' : 'desktop web application';

    const prompt = `Generate a high-fidelity, production-ready UI mockup for a ${deviceSpec}.

Screen Name: ${screenName}

Screen Description:
${context.screenDescription}

User Roles: ${context.userRoles.join(', ')}

Design Requirements:
- Modern, clean, professional design
- Production-ready quality (not a wireframe)
- Realistic UI components (buttons, inputs, cards, navigation)
- Proper spacing and typography
- Appropriate for ${layoutType} layout
- ${layoutType === LayoutType.MOBILE ? 'Mobile-optimized with touch targets' : 'Desktop-optimized with full navigation'}
- Follow current design trends and best practices
- Show realistic content (not Lorem Ipsum)
- Include navigation elements appropriate for this screen
- Respect the screen description exactly

Style: High-fidelity UI mockup, production-ready design, modern interface, professional quality`;

    return prompt;
  }

  /**
   * Extract role names from User Roles markdown table
   *
   * @private
   */
  private extractRoleNamesFromTable(rolesTable: string): string[] {
    const lines = rolesTable.split('\n');
    const roles: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();

      // Skip header row and separator
      if (line.startsWith('| Role Name') || line.startsWith('|---') || !line.startsWith('|')) {
        continue;
      }

      // Extract role name (first column)
      const columns = line.split('|').map(col => col.trim());
      if (columns.length >= 2 && columns[1]) {
        roles.push(columns[1]);
      }
    }

    return roles;
  }

  /**
   * Emit execution event
   *
   * @private
   */
  private async emitEvent(appRequestId: string, type: string, message: string): Promise<void> {
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

      this.logger.debug({ appRequestId, type, message }, 'Event emitted');
    }
  }

  /**
   * Convert Prisma ScreenMockup to ScreenMockupData
   *
   * @private
   */
  private toMockupData(mockup: ScreenMockup): ScreenMockupData {
    return {
      id: mockup.id,
      appRequestId: mockup.appRequestId,
      screenName: mockup.screenName,
      layoutType: mockup.layoutType as LayoutTypeValue,
      imagePath: mockup.imagePath,
      promptMetadata: JSON.parse(mockup.promptMetadata),
      status: mockup.status as MockupStatusValue,
      createdAt: mockup.createdAt,
      approvedAt: mockup.approvedAt,
    };
  }
}
