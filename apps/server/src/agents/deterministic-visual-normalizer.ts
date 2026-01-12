/**
 * DETERMINISTIC VISUAL NORMALIZATION LAYER (DVNL) - Tier 3.5
 *
 * Purpose: Visual Complexity Normalization
 * Converts approved Visual Expansion Contracts into explicit, bounded Visual Normalization Contracts
 * so that Visual Forge applies professional design discipline instead of visual maximalism.
 *
 * CRITICAL RULES:
 * - This agent does NOT design
 * - This agent does NOT invent UI elements
 * - This agent does NOT add or remove sections
 * - This agent ONLY constrains visual complexity
 * - All outputs must enforce density caps and layout discipline
 * - All contracts are human-approved before use
 * - Deterministic: same inputs → same hash
 *
 * WHY DVNL EXISTS:
 * Image models default to visual maximalism (too many gauges, over-decorated dashboards).
 * ChatGPT applies implicit normalization before rendering.
 * DVNL makes that normalization explicit, deterministic, and auditable.
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

const VISUAL_NORMALIZATION_ENVELOPE: PromptEnvelope = {
  agentName: 'DeterministicVisualNormalizer',
  agentVersion: '1.0.0',
  authorityLevel: 'VISUAL_NORMALIZATION_AUTHORITY',
  allowedActions: ['constrain_visual_complexity', 'enforce_density_caps', 'normalize_layout'],
  forbiddenActions: [
    'design_ui',
    'generate_images',
    'invent_elements',
    'add_sections',
    'remove_sections',
    'rename_screens',
    'bypass_caps',
    'access_code',
    'access_rules',
    'render_mockups',
  ],
};

// ============================================================================
// CLOSED VOCABULARIES (STRICT)
// ============================================================================

const LAYOUT_TYPES = ['desktop', 'mobile'] as const;
type LayoutType = (typeof LAYOUT_TYPES)[number];

const GRID_SYSTEMS = ['12-column', '16-column', 'fluid'] as const;
type GridSystem = (typeof GRID_SYSTEMS)[number];

const ALLOWED_CHART_TYPES = ['bar', 'line', 'pie', 'donut', 'area', 'bar_line_combo'] as const;
type AllowedChartType = (typeof ALLOWED_CHART_TYPES)[number];

const DISALLOWED_VISUALS = [
  'radial_gauges',
  'speedometers',
  'excessive_badges',
  'ornamental_icons',
  'decorative_meters',
  'animated_effects',
] as const;
type DisallowedVisual = (typeof DISALLOWED_VISUALS)[number];

const TYPOGRAPHY_SCALES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
type TypographyScale = (typeof TYPOGRAPHY_SCALES)[number];

const BACKGROUND_STYLES = ['neutral', 'light', 'dark'] as const;
type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

const VISUAL_COMPLEXITY_CAPS = ['low', 'medium', 'high'] as const;
type VisualComplexityCap = (typeof VISUAL_COMPLEXITY_CAPS)[number];

// ============================================================================
// VISUAL NORMALIZATION CONTRACT (OUTPUT SCHEMA)
// ============================================================================

interface LayoutRules {
  gridSystem: GridSystem;
  maxSectionsPerRow: number;
  maxCardsPerRow: number;
}

interface DensityRules {
  maxMetricCards: number;
  maxCharts: number;
  maxLists: number;
  maxFormFields?: number;
  maxNavigationItems?: number;
}

interface TypographyRules {
  headingScale: TypographyScale;
  metricScale: TypographyScale;
  labelScale: TypographyScale;
  maxFontVariants: number;
}

interface ColorRules {
  primaryAccentCount: number;
  secondaryAccentCount: number;
  backgroundStyle: BackgroundStyle;
}

interface VisualNormalizationContractData {
  screenName: string;
  layoutType: LayoutType;
  layoutRules: LayoutRules;
  densityRules: DensityRules;
  allowedChartTypes: AllowedChartType[];
  disallowedVisuals: DisallowedVisual[];
  typographyRules: TypographyRules;
  colorRules: ColorRules;
  visualComplexityCap: VisualComplexityCap;
}

interface IsolatedContext {
  basePrompt: { content: string; basePromptHash: string };
  planningDocsHash: string;
  screenIndexHash: string;
  screenDefinition: { screenName: string; content: string; screenHash: string };
  visualExpansionContract: {
    contractData: any;
    contractHash: string;
  };
}

// ============================================================================
// DETERMINISTIC VISUAL NORMALIZER CLASS
// ============================================================================

export class DeterministicVisualNormalizer {
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
        agent: VISUAL_NORMALIZATION_ENVELOPE.agentName,
        version: VISUAL_NORMALIZATION_ENVELOPE.agentVersion,
        authority: VISUAL_NORMALIZATION_ENVELOPE.authorityLevel,
      },
      'DeterministicVisualNormalizer initialized'
    );
  }

  /**
   * MAIN ENTRY POINT
   * Normalizes a Visual Expansion Contract into a Visual Normalization Contract
   */
  async normalizeVisualComplexity(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType
  ): Promise<string> {
    this.logger.info(
      { appRequestId, screenName, layoutType },
      'Starting visual complexity normalization'
    );

    // Validate envelope before proceeding
    this.validateEnvelope();

    // Lock conductor
    await this.conductor.lock(appRequestId);

    try {
      // Load isolated context (hash-based, approved artifacts only)
      const context = await this.loadIsolatedContext(appRequestId, screenName, layoutType);

      // Generate normalization contract via Claude
      const contractData = await this.generateNormalizationContract(
        context,
        screenName,
        layoutType
      );

      // Validate contract against closed vocabularies and caps
      this.validateContract(contractData, context);

      // Compute hash
      const contractHash = this.computeContractHash(contractData);

      // Save draft contract
      const contractId = randomUUID();
      await this.prisma.visualNormalizationContract.create({
        data: {
          id: contractId,
          appRequestId,
          screenName,
          layoutType,
          contractJson: JSON.stringify(contractData),
          contractHash,
          basePromptHash: context.basePrompt.basePromptHash,
          planningDocsHash: context.planningDocsHash,
          screenIndexHash: context.screenIndexHash,
          screenDefinitionHash: context.screenDefinition.screenHash,
          visualExpansionContractHash: context.visualExpansionContract.contractHash,
          status: 'awaiting_approval',
        },
      });

      this.logger.info(
        { contractId, contractHash, screenName },
        'Visual Normalization Contract created, awaiting approval'
      );

      // Pause for human approval
      await this.conductor.pauseForHuman(appRequestId, 'visual_normalization_approval');

      // Unlock conductor (approval will re-lock if needed)
      await this.conductor.unlock(appRequestId);

      return contractId;
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      this.logger.error({ error, appRequestId, screenName }, 'Visual normalization failed');
      throw error;
    }
  }

  /**
   * Approve a Visual Normalization Contract
   */
  async approve(contractId: string, approver: string): Promise<void> {
    const contract = await this.prisma.visualNormalizationContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`Visual Normalization Contract ${contractId} not found`);
    }

    if (contract.status === 'approved') {
      throw new Error(`Contract ${contractId} is already approved and immutable`);
    }

    await this.prisma.visualNormalizationContract.update({
      where: { id: contractId },
      data: {
        status: 'approved',
        approvedBy: approver,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      { contractId, approver, contractHash: contract.contractHash },
      'Visual Normalization Contract approved and hash-locked'
    );

    // Resume conductor
    await this.conductor.unlock(contract.appRequestId);
  }

  /**
   * Reject a Visual Normalization Contract
   */
  async reject(contractId: string, reason: string): Promise<void> {
    const contract = await this.prisma.visualNormalizationContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`Visual Normalization Contract ${contractId} not found`);
    }

    await this.prisma.visualNormalizationContract.update({
      where: { id: contractId },
      data: {
        status: 'rejected',
      },
    });

    this.logger.warn(
      { contractId, reason },
      'Visual Normalization Contract rejected'
    );

    // Unlock conductor (user can restart if needed)
    await this.conductor.unlock(contract.appRequestId);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private validateEnvelope(): void {
    const envelope = VISUAL_NORMALIZATION_ENVELOPE;

    if (envelope.authorityLevel !== 'VISUAL_NORMALIZATION_AUTHORITY') {
      throw new Error('Invalid authority level for DVNL');
    }

    if (!envelope.allowedActions.includes('constrain_visual_complexity')) {
      throw new Error('DVNL must be allowed to constrain visual complexity');
    }

    if (envelope.forbiddenActions.includes('add_sections')) {
      // Correct - DVNL should NOT add sections
    } else {
      throw new Error('DVNL must be forbidden from adding sections');
    }
  }

  private async loadIsolatedContext(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType
  ): Promise<IsolatedContext> {
    this.logger.info({ appRequestId, screenName }, 'Loading isolated context');

    // Load base prompt (hash-based)
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
      select: { prompt: true },
    });

    if (!appRequest) {
      throw new Error(`AppRequest ${appRequestId} not found`);
    }

    const basePromptHash = createHash('sha256').update(appRequest.prompt).digest('hex');

    // Load planning docs hash
    const planningDocs = await this.prisma.planningDocument.findMany({
      where: { appRequestId },
      orderBy: { createdAt: 'asc' },
    });

    const planningDocsHash = createHash('sha256')
      .update(
        planningDocs
          .map((doc) => `${doc.title}:${doc.documentHash}`)
          .sort()
          .join('|')
      )
      .digest('hex');

    // Load screen index hash
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error(`ScreenIndex not found for AppRequest ${appRequestId}`);
    }

    // Load screen definition
    const screenDefinition = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        canonicalName: screenName,
        layoutType,
      },
    });

    if (!screenDefinition) {
      throw new Error(
        `ScreenDefinition not found for ${screenName} (${layoutType})`
      );
    }

    // Load approved Visual Expansion Contract
    const vraContract = await this.prisma.visualExpansionContract.findFirst({
      where: {
        appRequestId,
        screenName,
        layoutType,
        status: 'approved',
      },
      orderBy: { contractVersion: 'desc' },
    });

    if (!vraContract) {
      throw new Error(
        `No approved Visual Expansion Contract found for ${screenName} (${layoutType}). VRA must run before DVNL.`
      );
    }

    const contractData = JSON.parse(vraContract.contractJson);

    return {
      basePrompt: {
        content: appRequest.prompt,
        basePromptHash,
      },
      planningDocsHash,
      screenIndexHash: screenIndex.screenIndexHash,
      screenDefinition: {
        screenName: screenDefinition.canonicalName,
        content: screenDefinition.content,
        screenHash: screenDefinition.screenDefinitionHash,
      },
      visualExpansionContract: {
        contractData,
        contractHash: vraContract.contractHash,
      },
    };
  }

  private async generateNormalizationContract(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType
  ): Promise<VisualNormalizationContractData> {
    this.logger.info({ screenName, layoutType }, 'Generating Visual Normalization Contract');

    const prompt = this.buildDeterministicPrompt(context, screenName, layoutType);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.2, // Low temperature for determinism
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/```json\n([\s\S]+?)\n```/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const contractData = JSON.parse(jsonMatch[1]) as VisualNormalizationContractData;

    this.logger.info(
      {
        screenName,
        layoutType,
        maxMetricCards: contractData.densityRules.maxMetricCards,
        maxCharts: contractData.densityRules.maxCharts,
        visualComplexityCap: contractData.visualComplexityCap,
      },
      'Visual Normalization Contract generated'
    );

    return contractData;
  }

  private buildDeterministicPrompt(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType
  ): string {
    const vraContract = context.visualExpansionContract.contractData;

    return `You are the Deterministic Visual Normalization Layer (DVNL) for Forge.

Your authority level is: ${VISUAL_NORMALIZATION_ENVELOPE.authorityLevel}

You are ALLOWED to:
${VISUAL_NORMALIZATION_ENVELOPE.allowedActions.map((a) => `- ${a}`).join('\n')}

You are FORBIDDEN from:
${VISUAL_NORMALIZATION_ENVELOPE.forbiddenActions.map((a) => `- ${a}`).join('\n')}

# YOUR TASK

Generate a Visual Normalization Contract that constrains the visual complexity of the following approved Visual Expansion Contract.

## INPUTS (HASH-LOCKED, APPROVED)

Screen Name: ${screenName}
Layout Type: ${layoutType}

Visual Expansion Contract (Approved):
\`\`\`json
${JSON.stringify(vraContract, null, 2)}
\`\`\`

Screen Definition:
${context.screenDefinition.content}

## CRITICAL RULES

1. **DO NOT invent or add UI elements** - only constrain what VRA already defined
2. **DO NOT remove sections** - only limit density within sections
3. **Enforce density caps** - prevent visual overload
4. **Use closed vocabularies** - no invention
5. **Fail loudly** if counts exceed professional limits

## NORMALIZATION RULES

Based on the VRA contract above:

- Count metric_cards sections → enforce maxMetricCards (limit: 6)
- Count charts → enforce maxCharts (limit: 3 for desktop, 2 for mobile)
- Count lists → enforce maxLists (limit: 2)
- Disallow: radial_gauges, speedometers, excessive_badges, ornamental_icons
- Layout: prefer 12-column grid for SaaS dashboards
- Typography: limit to 3 font variants
- Color: limit to 1 primary accent, 1 secondary accent

## OUTPUT FORMAT (REQUIRED)

Respond with ONLY valid JSON in this exact format:

\`\`\`json
{
  "screenName": "${screenName}",
  "layoutType": "${layoutType}",
  "layoutRules": {
    "gridSystem": "12-column",
    "maxSectionsPerRow": 1,
    "maxCardsPerRow": 4
  },
  "densityRules": {
    "maxMetricCards": 4,
    "maxCharts": 2,
    "maxLists": 2
  },
  "allowedChartTypes": ["bar", "line", "pie"],
  "disallowedVisuals": ["radial_gauges", "speedometers", "excessive_badges", "ornamental_icons"],
  "typographyRules": {
    "headingScale": "xl",
    "metricScale": "lg",
    "labelScale": "sm",
    "maxFontVariants": 3
  },
  "colorRules": {
    "primaryAccentCount": 1,
    "secondaryAccentCount": 1,
    "backgroundStyle": "neutral"
  },
  "visualComplexityCap": "medium"
}
\`\`\`

## EXAMPLES OF CAPS (${layoutType === 'desktop' ? 'DESKTOP' : 'MOBILE'})

For ${layoutType === 'desktop' ? 'desktop' : 'mobile'} dashboards:
- maxMetricCards: ${layoutType === 'desktop' ? '4-6' : '2-3'}
- maxCharts: ${layoutType === 'desktop' ? '2-3' : '1-2'}
- maxCardsPerRow: ${layoutType === 'desktop' ? '4' : '1-2'}
- maxLists: 2

IMPORTANT: If VRA defines MORE elements than these caps allow, you MUST set the cap to the VRA count (never reduce silently) AND flag with higher visualComplexityCap ("high" instead of "medium").

Generate the Visual Normalization Contract now.`;
  }

  private validateContract(
    contractData: VisualNormalizationContractData,
    context: IsolatedContext
  ): void {
    // Validate closed vocabularies
    if (!LAYOUT_TYPES.includes(contractData.layoutType as any)) {
      throw new Error(`Invalid layoutType: ${contractData.layoutType}`);
    }

    if (!GRID_SYSTEMS.includes(contractData.layoutRules.gridSystem as any)) {
      throw new Error(`Invalid gridSystem: ${contractData.layoutRules.gridSystem}`);
    }

    if (
      !VISUAL_COMPLEXITY_CAPS.includes(contractData.visualComplexityCap as any)
    ) {
      throw new Error(
        `Invalid visualComplexityCap: ${contractData.visualComplexityCap}`
      );
    }

    // Validate chart types are from allowed list
    for (const chartType of contractData.allowedChartTypes) {
      if (!ALLOWED_CHART_TYPES.includes(chartType as any)) {
        throw new Error(`Invalid chart type: ${chartType}`);
      }
    }

    // Validate disallowed visuals are from known list
    for (const visual of contractData.disallowedVisuals) {
      if (!DISALLOWED_VISUALS.includes(visual as any)) {
        throw new Error(`Invalid disallowed visual: ${visual}`);
      }
    }

    // Validate density rules are non-negative
    if (contractData.densityRules.maxMetricCards < 0) {
      throw new Error('maxMetricCards must be non-negative');
    }

    if (contractData.densityRules.maxCharts < 0) {
      throw new Error('maxCharts must be non-negative');
    }

    // Critical: Verify we're not inventing elements
    const vraContract = context.visualExpansionContract.contractData;
    const vraMetricCardsCount = vraContract.sections?.filter(
      (s: any) => s.type === 'metric_cards'
    ).length || 0;

    if (vraMetricCardsCount > 0 && contractData.densityRules.maxMetricCards === 0) {
      throw new Error(
        'DVNL cannot remove elements - VRA defined metric cards but DVNL set maxMetricCards to 0'
      );
    }

    this.logger.info(
      {
        screenName: contractData.screenName,
        layoutType: contractData.layoutType,
        validationResult: 'PASSED',
      },
      'Visual Normalization Contract validated'
    );
  }

  private computeContractHash(
    contractData: VisualNormalizationContractData
  ): string {
    // Sort keys for deterministic hashing
    const canonicalJson = JSON.stringify(contractData, Object.keys(contractData).sort());
    return createHash('sha256').update(canonicalJson).digest('hex');
  }
}
