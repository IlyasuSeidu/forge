/**
 * Visual Composition Authority (VCA)
 *
 * Tier 3.5 Agent - Visual Intelligence (Composition Layer)
 *
 * PURPOSE:
 * Explicitly composes the visual layout of a screen before rendering,
 * so that the image model never needs to "guess" layout, hierarchy, or balance.
 *
 * VCA decides HOW the screen is assembled, not WHAT exists or HOW it looks stylistically.
 *
 * AUTHORITY:
 * - Decide component grouping
 * - Decide section ordering
 * - Decide relative visual priority
 * - Decide intentional omission (within DVNL caps)
 * - Decide spacing and symmetry bias
 * - Decide grid usage strategy
 *
 * FORBIDDEN:
 * - Add or remove features
 * - Invent UI components
 * - Change counts beyond DVNL caps
 * - Modify VRA content
 * - Override Screen Definitions
 * - Apply styling, colors, fonts, or themes
 * - Generate images
 *
 * VCA never renders. VCA never designs. VCA only composes.
 */

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { ForgeConductor } from '../conductor/forge-conductor.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type LayoutType = 'desktop' | 'mobile';

interface PromptEnvelope {
  agentName: string;
  authorityLevel: string;
  allowedActions: string[];
  forbiddenActions: string[];
}

interface IsolatedContext {
  appRequestId: string;
  basePrompt: {
    content: string;
    basePromptHash: string;
  };
  planningDocsHash: string;
  screenIndexHash: string;
  screenDefinition: {
    screenName: string;
    content: string;
    screenHash: string;
  };
  visualExpansionContract: {
    contractData: any;
    contractHash: string;
  };
  visualNormalizationContract: {
    contractData: any;
    contractHash: string;
  };
}

interface VisualCompositionContractData {
  screenName: string;
  layoutType: LayoutType;
  primarySections: string[];
  secondarySections: string[];
  componentGrouping: {
    [groupName: string]: string[];
  };
  visualPriorityOrder: string[];
  intentionalOmissions: string[];
  spacingRules: {
    sectionSpacing: 'tight' | 'medium' | 'loose';
    cardDensity: 'low' | 'medium' | 'high';
  };
  gridStrategy: {
    columns: number;
    maxComponentsPerRow: number;
    symmetry: 'left-weighted' | 'centered' | 'balanced';
  };
  hierarchyHints: {
    emphasize: string[];
    deEmphasize: string[];
  };
  compositionRationale: string;
}

// ============================================================================
// VISUAL COMPOSITION AUTHORITY
// ============================================================================

export class VisualCompositionAuthority {
  private anthropic: Anthropic;
  private envelope: PromptEnvelope;

  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: Logger
  ) {
    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({ apiKey });

    // Define authority envelope (FEATURE 1)
    this.envelope = {
      agentName: 'VisualCompositionAuthority',
      authorityLevel: 'VISUAL_COMPOSITION_AUTHORITY',
      allowedActions: ['composeLayout'],
      forbiddenActions: [
        'modifyContent',
        'addFeatures',
        'removeFeatures',
        'applyStyles',
        'generateImages',
        'modifyCode',
        'changeVRAContent',
        'changeDVNLConstraints',
      ],
    };

    this.logger.info(
      {
        agent: 'VisualCompositionAuthority',
        version: '1.0.0',
        authority: this.envelope.authorityLevel,
      },
      'VisualCompositionAuthority initialized'
    );
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Compose visual layout for a screen
   *
   * REQUIREMENTS:
   * - Screen Definition must be approved
   * - VRA contract must be approved
   * - DVNL contract must be approved
   *
   * OUTPUTS:
   * - VisualCompositionContract (awaiting approval)
   *
   * GUARANTEES:
   * - Deterministic (same inputs → same hash)
   * - Never invents components
   * - Never violates DVNL caps
   * - Complete hash chain traceability
   */
  async composeLayout(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType
  ): Promise<string> {
    this.logger.info(
      { appRequestId, screenName, layoutType },
      'Starting visual composition'
    );

    // Validate envelope
    this.validateEnvelope();

    // Lock conductor
    await this.conductor.lock(appRequestId);

    try {
      // Load isolated context (requires approved VRA + DVNL contracts)
      this.logger.info({ appRequestId, screenName }, 'Loading isolated context');
      const context = await this.loadIsolatedContext(appRequestId, screenName, layoutType);

      // Generate composition contract via Claude
      this.logger.info({ screenName, layoutType }, 'Generating Visual Composition Contract');
      const contractData = await this.generateCompositionContract(
        context,
        screenName,
        layoutType
      );

      // Validate contract
      this.logger.info({ screenName, layoutType }, 'Validating Visual Composition Contract');
      this.validateContract(contractData, context);

      // Hash contract
      const contractJson = JSON.stringify(contractData, Object.keys(contractData).sort());
      const contractHash = createHash('sha256').update(contractJson).digest('hex');

      // Save contract (awaiting approval)
      const contractId = randomUUID();
      await this.prisma.visualCompositionContract.create({
        data: {
          id: contractId,
          appRequestId,
          screenName,
          layoutType,
          contractJson,
          contractHash,
          basePromptHash: context.basePrompt.basePromptHash,
          planningDocsHash: context.planningDocsHash,
          screenIndexHash: context.screenIndexHash,
          screenDefinitionHash: context.screenDefinition.screenHash,
          visualExpansionContractHash: context.visualExpansionContract.contractHash,
          visualNormalizationContractHash: context.visualNormalizationContract.contractHash,
          status: 'awaiting_approval',
        },
      });

      this.logger.info(
        {
          contractId,
          contractHash,
          screenName,
        },
        'Visual Composition Contract created, awaiting approval'
      );

      // Pause for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        'visual_composition_approval'
      );

      return contractId;
    } finally {
      await this.conductor.unlock(appRequestId);
    }
  }

  /**
   * Approve a composition contract
   */
  async approve(contractId: string, approver: string): Promise<void> {
    const contract = await this.prisma.visualCompositionContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`Visual Composition Contract not found: ${contractId}`);
    }

    if (contract.status === 'approved') {
      throw new Error(
        `IMMUTABILITY VIOLATION: Contract ${contractId} is already approved and hash-locked`
      );
    }

    await this.prisma.visualCompositionContract.update({
      where: { id: contractId },
      data: {
        status: 'approved',
        approvedBy: approver,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      {
        contractId,
        approver,
        contractHash: contract.contractHash,
      },
      'Visual Composition Contract approved and hash-locked'
    );

    // Unlock conductor
    await this.conductor.unlock(contract.appRequestId);
  }

  /**
   * Reject a composition contract
   */
  async reject(contractId: string, reason: string): Promise<void> {
    const contract = await this.prisma.visualCompositionContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`Visual Composition Contract not found: ${contractId}`);
    }

    await this.prisma.visualCompositionContract.update({
      where: { id: contractId },
      data: {
        status: 'rejected',
      },
    });

    this.logger.info(
      {
        contractId,
        reason,
      },
      'Visual Composition Contract rejected'
    );

    // Unlock conductor
    await this.conductor.unlock(contract.appRequestId);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * FEATURE 1: Envelope Validation
   */
  private validateEnvelope(): void {
    if (!this.envelope.allowedActions.includes('composeLayout')) {
      throw new Error(
        `AUTHORITY VIOLATION: ${this.envelope.agentName} attempted forbidden action: composeLayout`
      );
    }
  }

  /**
   * FEATURE 2: Context Isolation
   *
   * Load ONLY approved, hash-locked upstream artifacts.
   */
  private async loadIsolatedContext(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType
  ): Promise<IsolatedContext> {
    // Base Prompt (required, approved)
    const foundrySession = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (
      !foundrySession ||
      foundrySession.status !== 'approved' ||
      !foundrySession.basePromptHash
    ) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Foundry Session found. ` +
          `Visual Composition Authority requires hash-locked base prompt.`
      );
    }

    const basePromptHash = foundrySession.basePromptHash;

    // Planning Documents (required, approved)
    const masterPlan = await this.prisma.planningDocument.findFirst({
      where: { appRequestId, type: 'MASTER_PLAN', status: 'approved' },
    });

    const implementationPlan = await this.prisma.planningDocument.findFirst({
      where: { appRequestId, type: 'IMPLEMENTATION_PLAN', status: 'approved' },
    });

    if (
      !masterPlan ||
      !masterPlan.documentHash ||
      !implementationPlan ||
      !implementationPlan.documentHash
    ) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Planning Documents found. ` +
          `Visual Composition Authority requires hash-locked planning docs.`
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
        `CONTEXT ISOLATION VIOLATION: No approved Screen Index found. ` +
          `Visual Composition Authority requires hash-locked Screen Index.`
      );
    }

    // Screen Definition (required, approved)
    const screenDefinition = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        screenName,
        status: 'approved',
      },
    });

    if (!screenDefinition || !screenDefinition.screenHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Screen Definition found for ${screenName}. ` +
          `Visual Composition Authority requires hash-locked Screen Definition.`
      );
    }

    // VRA Contract (required, approved)
    const vraContract = await this.prisma.visualExpansionContract.findFirst({
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

    if (!vraContract || !vraContract.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Visual Expansion Contract found for ${screenName} (${layoutType}). ` +
          `VRA must run before VCA.`
      );
    }

    const vraData = JSON.parse(vraContract.contractJson);

    // DVNL Contract (required, approved)
    const dvnlContract = await this.prisma.visualNormalizationContract.findFirst({
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

    if (!dvnlContract || !dvnlContract.contractHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Visual Normalization Contract found for ${screenName} (${layoutType}). ` +
          `DVNL must run before VCA.`
      );
    }

    const dvnlData = JSON.parse(dvnlContract.contractJson);

    return {
      appRequestId,
      basePrompt: {
        content: foundrySession.draftPrompt,
        basePromptHash,
      },
      planningDocsHash,
      screenIndexHash: screenIndex.screenIndexHash,
      screenDefinition: {
        screenName: screenDefinition.screenName,
        content: screenDefinition.content,
        screenHash: screenDefinition.screenHash,
      },
      visualExpansionContract: {
        contractData: vraData,
        contractHash: vraContract.contractHash,
      },
      visualNormalizationContract: {
        contractData: dvnlData,
        contractHash: dvnlContract.contractHash,
      },
    };
  }

  /**
   * Generate composition contract via Claude API
   */
  private async generateCompositionContract(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType
  ): Promise<VisualCompositionContractData> {
    const prompt = this.buildCompositionPrompt(context, screenName, layoutType);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      temperature: 0.2, // Low temperature for determinism
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude API');
    }

    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const contractData: VisualCompositionContractData = JSON.parse(jsonMatch[0]);

    this.logger.info(
      {
        screenName,
        layoutType,
        primarySectionsCount: contractData.primarySections.length,
        secondarySectionsCount: contractData.secondarySections.length,
      },
      'Visual Composition Contract generated'
    );

    return contractData;
  }

  /**
   * Build deterministic composition prompt
   */
  private buildCompositionPrompt(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType
  ): string {
    const vraContract = context.visualExpansionContract.contractData;
    const dvnlContract = context.visualNormalizationContract.contractData;

    return `You are the Visual Composition Authority (VCA) for the Forge AI application factory.

YOUR ROLE:
You decide HOW a screen is visually composed FOR HIGH-FIDELITY, PRODUCTION-READY UI MOCKUP GENERATION.
Your composition decisions feed directly into VCRA (Visual Code Rendering Authority) which generates
real HTML/React code, determining whether the final mockup looks PROFESSIONAL (clear hierarchy, balanced layout)
or AMATEUR (flat, disorganized).

## CONTEXT: WHY THIS MATTERS

Your composition feeds into high-fidelity mockup generation. Your decisions directly impact:
- ✅ PROFESSIONAL MOCKUPS: Clear visual hierarchy, logical grouping, balanced composition
- ❌ AMATEUR MOCKUPS: Flat hierarchy, scattered components, poor spacing

Production-ready mockups require INTENTIONAL composition to achieve ChatGPT-level quality.

## YOUR DECISIONS

You decide:
- Component grouping (logical relationships)
- Section ordering (visual priority)
- Visual hierarchy (what to emphasize)
- Intentional omissions (within DVNL caps)
- Spacing and symmetry (professional layout)
- Grid usage (balanced composition)

You NEVER:
- Add or remove features
- Invent UI components
- Change counts beyond DVNL caps
- Apply colors, fonts, or themes (that's Visual Forge's job)

INPUTS (READ-ONLY):

Screen Name: ${screenName}
Layout Type: ${layoutType}

Screen Definition:
${context.screenDefinition.content}

VRA Contract (WHAT exists):
${JSON.stringify(vraContract, null, 2)}

DVNL Contract (HOW MUCH is allowed):
${JSON.stringify(dvnlContract, null, 2)}

YOUR TASK:

Compose a visual layout plan that:
1. Groups related components logically
2. Orders sections by visual priority
3. Respects DVNL density caps
4. May intentionally omit low-priority components (within caps)
5. Provides spacing/symmetry guidance
6. Ensures hierarchy is obvious

OUTPUT (Strict JSON):

{
  "screenName": "${screenName}",
  "layoutType": "${layoutType}",
  "primarySections": [<ordered list of main sections>],
  "secondarySections": [<ordered list of secondary sections>],
  "componentGrouping": {
    "<group-name>": [<component identifiers>]
  },
  "visualPriorityOrder": [<high to low priority components>],
  "intentionalOmissions": [<components to omit, if any>],
  "spacingRules": {
    "sectionSpacing": "tight" | "medium" | "loose",
    "cardDensity": "low" | "medium" | "high"
  },
  "gridStrategy": {
    "columns": <number>,
    "maxComponentsPerRow": <number>,
    "symmetry": "left-weighted" | "centered" | "balanced"
  },
  "hierarchyHints": {
    "emphasize": [<components to emphasize>],
    "deEmphasize": [<components to de-emphasize>]
  },
  "compositionRationale": "<1-2 sentence justification>"
}

CRITICAL RULES:
- Use ONLY components defined in VRA contract
- Respect ALL DVNL density caps
- No stylistic adjectives ("beautiful", "sleek")
- Deterministic (same inputs → same output)
- Output ONLY valid JSON, no markdown, no explanations

Generate the Visual Composition Contract now:`;
  }

  /**
   * Validate composition contract
   */
  private validateContract(
    contractData: VisualCompositionContractData,
    context: IsolatedContext
  ): void {
    // Validate required fields
    if (!contractData.screenName || !contractData.layoutType) {
      throw new Error('Contract missing required fields: screenName, layoutType');
    }

    if (!Array.isArray(contractData.primarySections)) {
      throw new Error('primarySections must be an array');
    }

    if (!Array.isArray(contractData.secondarySections)) {
      throw new Error('secondarySections must be an array');
    }

    if (!contractData.componentGrouping || typeof contractData.componentGrouping !== 'object') {
      throw new Error('componentGrouping must be an object');
    }

    if (!Array.isArray(contractData.visualPriorityOrder)) {
      throw new Error('visualPriorityOrder must be an array');
    }

    if (!Array.isArray(contractData.intentionalOmissions)) {
      throw new Error('intentionalOmissions must be an array');
    }

    if (!contractData.spacingRules || !contractData.gridStrategy || !contractData.hierarchyHints) {
      throw new Error('Contract missing required rules: spacingRules, gridStrategy, hierarchyHints');
    }

    if (!contractData.compositionRationale) {
      throw new Error('compositionRationale is required');
    }

    // Validate spacing rules
    const validSectionSpacing = ['tight', 'medium', 'loose'];
    const validCardDensity = ['low', 'medium', 'high'];

    if (!validSectionSpacing.includes(contractData.spacingRules.sectionSpacing)) {
      throw new Error(
        `Invalid sectionSpacing: ${contractData.spacingRules.sectionSpacing}. Must be: ${validSectionSpacing.join(', ')}`
      );
    }

    if (!validCardDensity.includes(contractData.spacingRules.cardDensity)) {
      throw new Error(
        `Invalid cardDensity: ${contractData.spacingRules.cardDensity}. Must be: ${validCardDensity.join(', ')}`
      );
    }

    // Validate grid strategy
    if (contractData.gridStrategy.columns <= 0 || contractData.gridStrategy.maxComponentsPerRow <= 0) {
      throw new Error('Grid columns and maxComponentsPerRow must be positive numbers');
    }

    const validSymmetry = ['left-weighted', 'centered', 'balanced'];
    if (!validSymmetry.includes(contractData.gridStrategy.symmetry)) {
      throw new Error(
        `Invalid symmetry: ${contractData.gridStrategy.symmetry}. Must be: ${validSymmetry.join(', ')}`
      );
    }

    this.logger.info(
      { screenName: contractData.screenName, layoutType: contractData.layoutType, validationResult: 'PASSED' },
      'Visual Composition Contract validated'
    );
  }
}
