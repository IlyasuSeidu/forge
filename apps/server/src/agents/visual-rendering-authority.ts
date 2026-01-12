/**
 * VISUAL RENDERING AUTHORITY (Tier 3.5)
 *
 * Purpose: Deterministic Visual Expansion Layer
 * Converts approved Screen Definitions into explicit, reviewable VisualExpansionContracts
 * so that Visual Forge renders pixels instead of guessing structure.
 *
 * CRITICAL RULES:
 * - This agent does NOT design
 * - This agent does NOT invent features
 * - This agent ONLY expands existing intent into explicit visual structure
 * - All outputs must use closed vocabularies (no invention)
 * - All contracts are human-approved before use
 * - Deterministic: same inputs → same hash
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';

// ============================================================================
// PROMPT ENVELOPE (MANDATORY)
// ============================================================================

interface PromptEnvelope {
  agentName: string;
  agentVersion: string;
  authorityLevel: string;
  allowedActions: string[];
  forbiddenActions: string[];
}

const VISUAL_RENDERING_ENVELOPE: PromptEnvelope = {
  agentName: 'VisualRenderingAuthority',
  agentVersion: '1.0.0',
  authorityLevel: 'RENDERING_AUTHORITY',
  allowedActions: ['expand_screen_structure'],
  forbiddenActions: [
    'design_ui',
    'generate_images',
    'invent_features',
    'rename_screens',
    'infer_logic',
    'access_rules',
    'access_code',
    'add_navigation_destinations',
    'add_flows',
    'add_modals',
    'modify_business_logic',
  ],
};

// ============================================================================
// CLOSED VOCABULARIES (STRICT)
// ============================================================================

const LAYOUT_TYPES = ['desktop', 'mobile'] as const;
type LayoutType = (typeof LAYOUT_TYPES)[number];

const SECTION_TYPES = [
  'navigation',
  'metric_cards',
  'data_visualization',
  'lists',
  'forms',
  'content',
  'links',
  'hero',
  'footer',
] as const;
type SectionType = (typeof SECTION_TYPES)[number];

const CHART_TYPES = ['bar', 'line', 'bar_line_combo', 'pie', 'donut', 'area'] as const;
type ChartType = (typeof CHART_TYPES)[number];

const LIST_TYPES = ['Tasks', 'Recent Activity', 'Notifications', 'Messages'] as const;
type ListType = (typeof LIST_TYPES)[number];

const NAVIGATION_ELEMENTS = [
  'logo',
  'nav_items',
  'notifications',
  'user_avatar',
  'primary_action',
  'search',
  'settings',
] as const;
type NavigationElement = (typeof NAVIGATION_ELEMENTS)[number];

// ============================================================================
// VISUAL EXPANSION CONTRACT (OUTPUT SCHEMA)
// ============================================================================

interface VisualExpansionSection {
  id: string;
  type: SectionType;
  elements?: NavigationElement[] | string[];
  cards?: Array<{ label: string; example: string }>;
  charts?: Array<{ chartType: ChartType; title: string }>;
  lists?: ListType[];
}

interface VisualExpansionContractData {
  screen: string;
  layoutType: LayoutType;
  sections: VisualExpansionSection[];
}

interface IsolatedContext {
  basePrompt: { content: string; basePromptHash: string };
  masterPlan: { content: string; documentHash: string };
  implementationPlan: { content: string; documentHash: string };
  screenIndex: { screens: string[]; screenIndexHash: string };
  screenDefinition: { screenName: string; content: string; screenHash: string };
  userJourneys: Array<{ roleName: string; content: string; journeyHash: string }>;
  planningDocsHash: string;
}

// ============================================================================
// VISUAL RENDERING AUTHORITY CLASS
// ============================================================================

export class VisualRenderingAuthority {
  private anthropic: Anthropic;

  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: Logger
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({ apiKey });

    this.logger.info(
      {
        agent: VISUAL_RENDERING_ENVELOPE.agentName,
        version: VISUAL_RENDERING_ENVELOPE.agentVersion,
        authority: VISUAL_RENDERING_ENVELOPE.authorityLevel,
      },
      'VisualRenderingAuthority initialized'
    );
  }

  /**
   * MAIN ENTRY POINT
   * Expands a single screen into a VisualExpansionContract
   */
  async expandScreen(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType
  ): Promise<string> {
    this.logger.info(
      { appRequestId, screenName, layoutType },
      'Starting visual expansion for screen'
    );

    // Validate envelope before proceeding
    this.validateEnvelope();

    // Lock conductor
    await this.conductor.lock(appRequestId);

    try {
      // Load isolated context (hash-based, approved artifacts only)
      const context = await this.loadIsolatedContext(appRequestId, screenName);

      // Generate expansion contract via Claude
      const contractData = await this.generateExpansionContract(
        context,
        screenName,
        layoutType
      );

      // Validate contract against closed vocabularies
      this.validateContract(contractData);

      // Compute hash
      const contractHash = this.computeContractHash(contractData);

      // Save draft contract
      const contractId = randomUUID();
      await this.prisma.visualExpansionContract.create({
        data: {
          id: contractId,
          appRequestId,
          screenName,
          layoutType,
          contractJson: JSON.stringify(contractData),
          contractHash,
          basePromptHash: context.basePrompt.basePromptHash,
          planningDocsHash: context.planningDocsHash,
          screenIndexHash: context.screenIndex.screenIndexHash,
          screenDefinitionHash: context.screenDefinition.screenHash,
          journeyHash: context.userJourneys[0]?.journeyHash || '',
          status: 'awaiting_approval',
        },
      });

      this.logger.info(
        {
          appRequestId,
          contractId,
          screenName,
          contractHash,
        },
        'Visual expansion contract generated and saved'
      );

      // Pause conductor for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        `Visual expansion for "${screenName}" (${layoutType}) ready for review`
      );

      return contractId;
    } finally {
      await this.conductor.unlock(appRequestId);
    }
  }

  /**
   * Approve a visual expansion contract
   */
  async approve(contractId: string, approvedBy: string): Promise<void> {
    const contract = await this.prisma.visualExpansionContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`VisualExpansionContract ${contractId} not found`);
    }

    if (contract.status !== 'awaiting_approval') {
      throw new Error(
        `Cannot approve contract in status "${contract.status}". Must be "awaiting_approval".`
      );
    }

    // Approve and lock
    await this.prisma.visualExpansionContract.update({
      where: { id: contractId },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      {
        contractId,
        approvedBy,
        screenName: contract.screenName,
        contractHash: contract.contractHash,
      },
      'Visual expansion contract approved and locked'
    );
  }

  /**
   * Reject a visual expansion contract
   */
  async reject(contractId: string, reason: string): Promise<void> {
    const contract = await this.prisma.visualExpansionContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`VisualExpansionContract ${contractId} not found`);
    }

    await this.prisma.visualExpansionContract.update({
      where: { id: contractId },
      data: {
        status: 'rejected',
      },
    });

    this.logger.warn(
      {
        contractId,
        reason,
        screenName: contract.screenName,
      },
      'Visual expansion contract rejected'
    );
  }

  /**
   * Get current contract for a screen
   */
  async getCurrentContract(appRequestId: string, screenName: string, layoutType: LayoutType): Promise<any> {
    const contract = await this.prisma.visualExpansionContract.findFirst({
      where: {
        appRequestId,
        screenName,
        layoutType,
        status: 'approved',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!contract) {
      return null;
    }

    return {
      id: contract.id,
      contractData: JSON.parse(contract.contractJson),
      contractHash: contract.contractHash,
    };
  }

  /**
   * Verify hash chain integrity
   */
  async verifyIntegrity(contractId: string): Promise<boolean> {
    const contract = await this.prisma.visualExpansionContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`VisualExpansionContract ${contractId} not found`);
    }

    // Recompute hash
    const contractData = JSON.parse(contract.contractJson);
    const recomputedHash = this.computeContractHash(contractData);

    const isValid = recomputedHash === contract.contractHash;

    if (!isValid) {
      this.logger.error(
        {
          contractId,
          expectedHash: contract.contractHash,
          actualHash: recomputedHash,
        },
        'Visual expansion contract hash mismatch - integrity violation!'
      );
    }

    return isValid;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Validate PromptEnvelope
   */
  private validateEnvelope(): void {
    const envelope = VISUAL_RENDERING_ENVELOPE;

    if (envelope.agentName !== 'VisualRenderingAuthority') {
      throw new Error('ENVELOPE VIOLATION: Invalid agent name');
    }

    if (envelope.authorityLevel !== 'RENDERING_AUTHORITY') {
      throw new Error('ENVELOPE VIOLATION: Invalid authority level');
    }

    this.logger.debug({ envelope }, 'Prompt envelope validated');
  }

  /**
   * Load isolated context (hash-based, approved artifacts only)
   */
  private async loadIsolatedContext(
    appRequestId: string,
    screenName: string
  ): Promise<IsolatedContext> {
    this.logger.debug({ appRequestId, screenName }, 'Loading isolated context');

    // Base Prompt (required, approved)
    const foundrySession = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!foundrySession || foundrySession.status !== 'approved' || !foundrySession.basePromptHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Base Prompt found. ` +
          `Visual Rendering Authority requires hash-locked Base Prompt.`
      );
    }

    // Planning Documents (required, approved)
    const masterPlan = await this.prisma.planningDocument.findFirst({
      where: { appRequestId, type: 'MASTER_PLAN', status: 'approved' },
    });

    const implementationPlan = await this.prisma.planningDocument.findFirst({
      where: { appRequestId, type: 'IMPLEMENTATION_PLAN', status: 'approved' },
    });

    if (!masterPlan || !masterPlan.documentHash || !implementationPlan || !implementationPlan.documentHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Planning Documents found. ` +
          `Visual Rendering Authority requires hash-locked planning docs.`
      );
    }

    const planningDocsHash = createHash('sha256')
      .update(masterPlan.documentHash + implementationPlan.documentHash)
      .digest('hex');

    // Screen Index (required, approved)
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || screenIndex.status !== 'approved' || !screenIndex.screenIndexHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ScreenIndex found. ` +
          `Visual Rendering Authority requires hash-locked ScreenIndex.`
      );
    }

    // Screen Definition (required, approved)
    const screenDefinition = await this.prisma.screenDefinition.findFirst({
      where: { appRequestId, screenName, status: 'approved' },
    });

    if (!screenDefinition || !screenDefinition.screenHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Screen Definition found for: ${screenName}. ` +
          `Visual Rendering Authority requires hash-locked Screen Definition.`
      );
    }

    // User Journeys (optional, but must be approved if present)
    const userJourneys = await this.prisma.userJourney.findMany({
      where: { appRequestId, status: 'approved' },
      orderBy: { order: 'asc' },
    });

    const journeysData = userJourneys
      .filter((j) => j.journeyHash)
      .map((j) => ({
        roleName: j.roleName,
        content: j.content,
        journeyHash: j.journeyHash!,
      }));

    this.logger.info(
      {
        appRequestId,
        screenName,
        screenHash: screenDefinition.screenHash,
        screenIndexHash: screenIndex.screenIndexHash,
        journeysCount: journeysData.length,
      },
      'Isolated context loaded (hash-based)'
    );

    return {
      basePrompt: {
        content: foundrySession.draftPrompt || '',
        basePromptHash: foundrySession.basePromptHash,
      },
      masterPlan: {
        content: masterPlan.content,
        documentHash: masterPlan.documentHash!,
      },
      implementationPlan: {
        content: implementationPlan.content,
        documentHash: implementationPlan.documentHash!,
      },
      screenIndex: {
        screens: JSON.parse(screenIndex.screens),
        screenIndexHash: screenIndex.screenIndexHash,
      },
      screenDefinition: {
        screenName: screenDefinition.screenName,
        content: screenDefinition.content,
        screenHash: screenDefinition.screenHash!,
      },
      userJourneys: journeysData,
      planningDocsHash,
    };
  }

  /**
   * Generate expansion contract via Claude API
   */
  private async generateExpansionContract(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType
  ): Promise<VisualExpansionContractData> {
    this.logger.info({ screenName, layoutType }, 'Generating expansion contract via Claude API');

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context, screenName, layoutType);

    const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: 8000,
      temperature: 0.2, // Low temperature for determinism
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract JSON from response
    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Expected text response from Claude API');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const contractData: VisualExpansionContractData = JSON.parse(jsonMatch[0]);

    this.logger.info(
      {
        screenName,
        layoutType,
        sectionsCount: contractData.sections.length,
      },
      'Expansion contract generated'
    );

    return contractData;
  }

  /**
   * Build system prompt for Claude
   */
  private buildSystemPrompt(): string {
    return `You are the Visual Rendering Authority, a deterministic expansion agent.

YOUR SOLE PURPOSE:
Convert an approved Screen Definition into an explicit VisualExpansionContract
so that image generation can render pixels instead of guessing structure.

CRITICAL RULES:
1. You do NOT design - you EXPAND existing intent
2. You do NOT invent features - you make implicit structure explicit
3. You MUST use closed vocabularies ONLY
4. You MUST output valid JSON only (no prose, no markdown)
5. Same inputs → same outputs (deterministic)

CLOSED VOCABULARIES (YOU MAY ONLY USE THESE VALUES):

Layout Types: ${LAYOUT_TYPES.join(', ')}
Section Types: ${SECTION_TYPES.join(', ')}
Chart Types: ${CHART_TYPES.join(', ')}
List Types: ${LIST_TYPES.join(', ')}
Navigation Elements: ${NAVIGATION_ELEMENTS.join(', ')}

ALLOWED ACTIONS:
- Expand "analytics cards" into specific card examples (Total Revenue, New Users, etc.)
- Expand "charts" into specific chart types (bar, line, pie)
- Apply standard SaaS layout patterns
- Provide representative example data (clearly marked as visual placeholders)
- Structure hierarchy logically (header → metrics → charts → lists → footer)

FORBIDDEN ACTIONS:
- Adding new features not in Screen Definition
- Adding new navigation destinations
- Inventing flows, modals, or dialogs
- Renaming anything
- Inferring business logic
- Adding adjectives or design opinions

OUTPUT FORMAT (STRICT JSON):
{
  "screen": "ScreenName",
  "layoutType": "desktop" | "mobile",
  "sections": [
    {
      "id": "unique-id",
      "type": "section_type",
      "elements": ["element1", "element2"],
      "cards": [{"label": "Label", "example": "Value"}],
      "charts": [{"chartType": "bar", "title": "Title"}],
      "lists": ["Tasks"]
    }
  ]
}

If anything is unclear or contradicts the Screen Definition → FAIL LOUDLY.

You are a compiler, not a designer.`;
  }

  /**
   * Build user prompt for Claude
   */
  private buildUserPrompt(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType
  ): string {
    return `Expand the following Screen Definition into an explicit VisualExpansionContract.

BASE PROMPT:
${context.basePrompt.content}

MASTER PLAN (Excerpt):
${context.masterPlan.content.substring(0, 2000)}

SCREEN DEFINITION:
${context.screenDefinition.content}

SCREEN NAME: ${screenName}
LAYOUT TYPE: ${layoutType}

INSTRUCTIONS:
1. Read the Screen Definition carefully
2. Identify the layout structure and key UI elements
3. Expand them into explicit sections using ONLY the closed vocabularies
4. Provide representative example data for cards and charts
5. Output strict JSON (no prose, no markdown)

Example expansion:
If Screen Definition says "Analytics cards with key metrics" →
Expand to: "cards": [
  {"label": "Total Revenue", "example": "$54,320"},
  {"label": "New Users", "example": "1,248"},
  {"label": "Orders", "example": "320"}
]

If Screen Definition says "Charts showing data trends" →
Expand to: "charts": [
  {"chartType": "bar_line_combo", "title": "Monthly Performance"},
  {"chartType": "pie", "title": "Traffic Sources"}
]

OUTPUT JSON NOW:`;
  }

  /**
   * Validate contract against closed vocabularies
   */
  private validateContract(contractData: VisualExpansionContractData): void {
    const errors: string[] = [];

    // Validate layout type
    if (!LAYOUT_TYPES.includes(contractData.layoutType as any)) {
      errors.push(
        `Invalid layoutType: "${contractData.layoutType}". Must be one of: ${LAYOUT_TYPES.join(', ')}`
      );
    }

    // Validate sections
    for (const section of contractData.sections) {
      if (!SECTION_TYPES.includes(section.type as any)) {
        errors.push(
          `Invalid section type: "${section.type}". Must be one of: ${SECTION_TYPES.join(', ')}`
        );
      }

      // Validate chart types
      if (section.charts) {
        for (const chart of section.charts) {
          if (!CHART_TYPES.includes(chart.chartType as any)) {
            errors.push(
              `Invalid chart type: "${chart.chartType}". Must be one of: ${CHART_TYPES.join(', ')}`
            );
          }
        }
      }

      // Validate list types
      if (section.lists) {
        for (const list of section.lists) {
          if (!LIST_TYPES.includes(list as any)) {
            errors.push(
              `Invalid list type: "${list}". Must be one of: ${LIST_TYPES.join(', ')}`
            );
          }
        }
      }

      // Validate navigation elements
      if (section.type === 'navigation' && section.elements) {
        for (const element of section.elements) {
          if (!NAVIGATION_ELEMENTS.includes(element as any)) {
            errors.push(
              `Invalid navigation element: "${element}". Must be one of: ${NAVIGATION_ELEMENTS.join(', ')}`
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      this.logger.error(
        { contractData, errors },
        'VOCABULARY VIOLATION: Contract validation failed'
      );
      throw new Error(
        `Visual Expansion Contract validation failed:\n${errors.join('\n')}`
      );
    }

    this.logger.debug({ contractData }, 'Contract validated successfully');
  }

  /**
   * Compute contract hash (deterministic)
   */
  private computeContractHash(contractData: VisualExpansionContractData): string {
    // Sort keys for deterministic hashing
    const serialized = JSON.stringify(contractData, Object.keys(contractData).sort());
    const hash = createHash('sha256').update(serialized).digest('hex');
    return hash;
  }
}
