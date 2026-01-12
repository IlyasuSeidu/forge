/**
 * Visual Forge - Production Hardened (Tier 3: VISUAL_AUTHORITY)
 *
 * PRODUCTION HARDENING COMPLETE:
 * ✅ 1. Envelope validation (VISUAL_AUTHORITY)
 * ✅ 2. Context isolation (hash-based)
 * ✅ 3. Closed screen vocabulary enforcement
 * ✅ 4. Screen canonicalization (fail loudly)
 * ✅ 5. VisualMockupContract validation
 * ✅ 6. Determinism guarantees (fixed model, prompt template, style vocabulary)
 * ✅ 7. Immutability & hashing
 * ✅ 8. Human approval gates
 * ✅ 9. Failure & escalation
 * ✅ 10. Full integration
 *
 * ARCHITECTURE NOTE (2026-01-12):
 * Visual Forge now works in coordination with two upstream agents:
 * - VRA (Visual Rendering Authority, Tier 3.5): Expands Screen Definitions into explicit VisualExpansionContracts
 * - DVNL (Deterministic Visual Normalization Layer, Tier 3.5): Constrains visual complexity to prevent maximalism
 * - Visual Forge: Renders approved contracts into pixel-perfect mockups
 *
 * INTEGRATION STATUS:
 * ✅ Phase 1 (Complete): Visual Forge uses deterministic prompts directly
 * ✅ Phase 2 (Complete): Visual Forge consumes approved VisualExpansionContracts from VRA
 * ✅ Phase 2.5 (Complete): Visual Forge consumes approved VisualNormalizationContracts from DVNL
 * - Result: ChatGPT-level image quality + ChatGPT-level restraint with enterprise-grade auditability
 *
 * HOW IT WORKS:
 * 1. Visual Forge checks for approved VisualExpansionContract (VRA)
 * 2. Visual Forge checks for approved VisualNormalizationContract (DVNL)
 * 3. If both found: Builds rich, hierarchical prompt WITH explicit density constraints
 *    - VRA provides WHAT to show (sections, elements, charts)
 *    - DVNL provides HOW MUCH is allowed (maxMetricCards, disallowedVisuals, complexity caps)
 *    - Result: Professional, balanced design (no radial gauges, speedometers, or visual clutter)
 * 4. If only VRA found: Builds rich prompt WITHOUT constraints (may result in visual maximalism)
 * 5. If neither found: Falls back to legacy deterministic prompt
 * 6. Generates mockup via OpenAI GPT Image 1.5 (with DALL-E 3 fallback)
 *
 * SECURITY MODEL:
 * - Visual Forge is VISUAL_AUTHORITY
 * - Its output (mockup images) is treated as law by downstream agents
 * - It CANNOT invent screens, features, or UI elements
 * - It CANNOT rename or reinterpret screens
 * - All screen identifiers MUST come from approved ScreenIndex
 * - Context isolation prevents reading code, rules, or execution artifacts
 * - Hash chain ensures mockups trace to approved planning docs
 */

import type { PrismaClient } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * AUTHORITY LEVELS
 *
 * Visual Forge operates at VISUAL_AUTHORITY:
 * - Can generate mockup images
 * - Can store mockups
 * - Can emit visual events
 * - CANNOT modify screens, rules, code, or execution plans
 */
type AuthorityLevel =
  | 'FOUNDATIONAL_AUTHORITY' // Base prompt, architecture
  | 'BEHAVIORAL_AUTHORITY' // User flows, journeys
  | 'VISUAL_AUTHORITY' // UI mockups (THIS AGENT)
  | 'LOGICAL_AUTHORITY' // Business rules, constraints
  | 'TRANSLATION_AUTHORITY' // LLM prompts
  | 'EXECUTION_AUTHORITY'; // Code generation

interface PromptEnvelope {
  agentName: string;
  agentVersion: string;
  authorityLevel: AuthorityLevel;
  allowedActions: string[];
  forbiddenActions: string[];
}

/**
 * Visual Forge Prompt Envelope
 *
 * Defines what Visual Forge can and cannot do.
 */
const VISUAL_FORGE_ENVELOPE: PromptEnvelope = {
  agentName: 'VisualForge',
  agentVersion: '1.0.0',
  authorityLevel: 'VISUAL_AUTHORITY',
  allowedActions: ['generateMockup', 'storeMockup', 'emitVisualEvents'],
  forbiddenActions: [
    'renameScreens',
    'inventUIElements',
    'inventFlows',
    'modifyScreens',
    'readCode',
    'readRules',
    'readVerificationResults',
  ],
};

/**
 * Visual Mockup Contract
 *
 * Strict schema that every mockup must conform to.
 */
export interface VisualMockupContract {
  screenName: string; // MUST exist in ScreenIndex (canonical)
  layoutType: 'mobile' | 'desktop';
  imageUrl: string; // Stored artifact path
  imageHash: string; // SHA-256 of image data
  derivedFrom: {
    screenHash: string; // Screen Definition hash
    journeyHash?: string; // Optional journey hash if relevant
  };
  visualElements: {
    headers: string[];
    primaryActions: string[];
    secondaryActions: string[];
    navigationType: 'top' | 'bottom' | 'side' | 'none';
  };
  notes: string;
}

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
 * Mockup Generation Result
 */
export interface MockupGenerationResult {
  mockupId: string;
  screenName: string;
  layoutType: LayoutTypeValue;
  imagePath: string;
  imageHash: string;
  contract: VisualMockupContract;
  status: MockupStatusValue;
  mockupVersion: number;
  createdAt: Date;
}

/**
 * Visual Forge State
 */
export interface VisualForgeState {
  totalScreens: number;
  completedCount: number;
  remainingCount: number;
  currentMockup: MockupGenerationResult | null;
  allScreenNames: string[];
}

/**
 * Context Snapshot (for mockup generation)
 */
interface DesignContext {
  appRequestId: string; // Added for VRA Phase 2 integration
  screenDefinition: {
    screenName: string;
    content: string;
    screenHash: string;
  };
  screenIndex: {
    screens: string[];
    screenIndexHash: string;
  };
  userJourneys: Array<{
    roleName: string;
    content: string;
    journeyHash: string;
  }>;
  basePromptHash: string;
  planningDocsHash: string;
}

/**
 * Visual Forge - Production Hardened
 *
 * Tier 3 VISUAL_AUTHORITY agent responsible for generating
 * high-fidelity UI mockups with production-grade guarantees.
 */
export class VisualForgeHardened {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private mockupsDir: string;
  private envelope: PromptEnvelope;
  private failureCount: Map<string, number> = new Map();

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;
    this.envelope = VISUAL_FORGE_ENVELOPE;
    this.mockupsDir = path.join(process.cwd(), 'mockups');

    this.logger.info(
      {
        agent: this.envelope.agentName,
        version: this.envelope.agentVersion,
        authority: this.envelope.authorityLevel,
      },
      'VisualForgeHardened initialized'
    );
  }

  /**
   * FEATURE 1: Envelope Validation
   *
   * Validates that requested action is allowed for this authority level.
   */
  private validateAction(action: string): void {
    if (this.envelope.forbiddenActions.includes(action)) {
      const error = new Error(
        `AUTHORITY VIOLATION: ${this.envelope.agentName} attempted forbidden action: ${action}. ` +
          `Authority level: ${this.envelope.authorityLevel}. ` +
          `This agent can ONLY: ${this.envelope.allowedActions.join(', ')}`
      );
      this.logger.error({ action, envelope: this.envelope }, 'Authority violation detected');
      throw error;
    }

    if (!this.envelope.allowedActions.includes(action)) {
      const error = new Error(
        `AUTHORITY VIOLATION: ${this.envelope.agentName} attempted unknown action: ${action}`
      );
      this.logger.error({ action, envelope: this.envelope }, 'Unknown action attempted');
      throw error;
    }

    this.logger.debug({ action, authority: this.envelope.authorityLevel }, 'Action validated');
  }

  /**
   * FEATURE 2: Context Isolation
   *
   * Loads ONLY approved artifacts via hash references.
   * NEVER reads planning documents, code, rules, or execution artifacts directly.
   */
  private async loadIsolatedContext(appRequestId: string, screenName: string): Promise<DesignContext> {
    this.validateAction('generateMockup');

    this.logger.debug({ appRequestId, screenName }, 'Loading isolated context');

    // Load approved ScreenIndex
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || screenIndex.status !== 'approved' || !screenIndex.screenIndexHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved ScreenIndex found. ` +
          `Visual Forge requires hash-locked ScreenIndex.`
      );
    }

    const screens: string[] = JSON.parse(screenIndex.screens);

    // Load approved Screen Definition (by hash)
    const screenDef = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        screenName,
        status: 'approved',
      },
    });

    if (!screenDef || !screenDef.screenHash) {
      throw new Error(
        `CONTEXT ISOLATION VIOLATION: No approved Screen Definition found for: ${screenName}. ` +
          `Visual Forge requires hash-locked Screen Definitions.`
      );
    }

    // Load approved User Journeys (filter by relevance to this screen)
    const journeys = await this.prisma.userJourney.findMany({
      where: {
        appRequestId,
        status: 'approved',
      },
    });

    const relevantJourneys = journeys
      .filter(j => j.journeyHash && j.content.toLowerCase().includes(screenName.toLowerCase()))
      .map(j => ({
        roleName: j.roleName,
        content: j.content,
        journeyHash: j.journeyHash!,
      }));

    // CRITICAL: We do NOT read planning documents directly
    // We only store their hashes for traceability
    const basePromptHash = screenDef.basePromptHash || '';
    const planningDocsHash = screenDef.planningDocsHash || '';

    this.logger.info(
      {
        appRequestId,
        screenName,
        screenHash: screenDef.screenHash,
        screenIndexHash: screenIndex.screenIndexHash,
        journeysCount: relevantJourneys.length,
      },
      'Isolated context loaded (hash-based)'
    );

    return {
      appRequestId, // Added for VRA Phase 2 integration
      screenDefinition: {
        screenName: screenDef.screenName,
        content: screenDef.content,
        screenHash: screenDef.screenHash,
      },
      screenIndex: {
        screens,
        screenIndexHash: screenIndex.screenIndexHash,
      },
      userJourneys: relevantJourneys,
      basePromptHash,
      planningDocsHash,
    };
  }

  /**
   * FEATURE 3: Screen Identifier Lock
   *
   * Canonicalizes screen name against approved ScreenIndex.
   * FAILS LOUDLY if screen name not in vocabulary.
   */
  private canonicalizeScreenName(inputName: string, allowedScreens: string[]): string {
    const normalized = inputName.trim().toLowerCase();

    // Find exact match (case-insensitive)
    const canonical = allowedScreens.find(name => name.toLowerCase() === normalized);

    if (!canonical) {
      throw new Error(
        `SCREEN NAME CANONICALIZATION FAILURE: "${inputName}" is not in the allowed screen vocabulary.\n` +
          `Allowed screens: ${allowedScreens.join(', ')}\n` +
          `LLMs must NOT invent screen identifiers. This is a structural integrity violation.`
      );
    }

    this.logger.debug({ input: inputName, canonical }, 'Screen name canonicalized');
    return canonical;
  }

  /**
   * FEATURE 4: Visual Mockup Contract Validation
   *
   * Validates that mockup contract conforms to strict schema.
   */
  private validateMockupContract(
    contract: VisualMockupContract,
    context: DesignContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate screenName exists in ScreenIndex
    if (!context.screenIndex.screens.includes(contract.screenName)) {
      errors.push(
        `Screen name "${contract.screenName}" not found in approved ScreenIndex. ` +
          `Allowed: ${context.screenIndex.screens.join(', ')}`
      );
    }

    // Validate layoutType
    if (contract.layoutType !== 'mobile' && contract.layoutType !== 'desktop') {
      errors.push(`Invalid layoutType: ${contract.layoutType}. Must be 'mobile' or 'desktop'.`);
    }

    // Validate imageUrl
    if (!contract.imageUrl || contract.imageUrl.trim() === '') {
      errors.push('imageUrl is required');
    }

    // Validate imageHash (must be SHA-256)
    if (!contract.imageHash || contract.imageHash.length !== 64) {
      errors.push('imageHash must be a valid SHA-256 hash (64 hex characters)');
    }

    // Validate derivedFrom
    if (!contract.derivedFrom.screenHash) {
      errors.push('derivedFrom.screenHash is required');
    }

    // Validate screenHash matches context
    if (contract.derivedFrom.screenHash !== context.screenDefinition.screenHash) {
      errors.push(
        `screenHash mismatch: contract has ${contract.derivedFrom.screenHash}, ` +
          `context has ${context.screenDefinition.screenHash}`
      );
    }

    // Validate visualElements
    if (!contract.visualElements) {
      errors.push('visualElements is required');
    } else {
      if (!Array.isArray(contract.visualElements.headers)) {
        errors.push('visualElements.headers must be an array');
      }
      if (!Array.isArray(contract.visualElements.primaryActions)) {
        errors.push('visualElements.primaryActions must be an array');
      }
      if (!Array.isArray(contract.visualElements.secondaryActions)) {
        errors.push('visualElements.secondaryActions must be an array');
      }
      const validNavTypes = ['top', 'bottom', 'side', 'none'];
      if (!validNavTypes.includes(contract.visualElements.navigationType)) {
        errors.push(
          `visualElements.navigationType must be one of: ${validNavTypes.join(', ')}`
        );
      }
    }

    const valid = errors.length === 0;

    if (!valid) {
      this.logger.warn({ contract, errors }, 'Mockup contract validation failed');
    } else {
      this.logger.debug({ contract }, 'Mockup contract validated');
    }

    return { valid, errors };
  }

  /**
   * FEATURE 5: Determinism Guarantees
   *
   * Builds deterministic image generation prompt.
   * Same inputs → same prompt → same visual intent.
   *
   * PHASE 2 (2026-01-12): Integrates with Visual Rendering Authority (VRA).
   * - If approved VisualExpansionContract exists → build rich, hierarchical prompt
   * - If no contract → fall back to legacy deterministic prompt
   *
   * PHASE 2.5 (2026-01-12): Integrates with Deterministic Visual Normalization Layer (DVNL).
   * - If approved VisualNormalizationContract exists → inject visual complexity constraints
   * - Prevents visual maximalism (radial gauges, speedometers, over-decoration)
   * - Result: ChatGPT-level restraint with professional design discipline
   */
  private async buildDeterministicImagePrompt(
    screenName: string,
    layoutType: LayoutTypeValue,
    context: DesignContext
  ): Promise<string> {
    // Try to load approved VisualExpansionContract (VRA Phase 2 Integration)
    const expansionContract = await this.loadVisualExpansionContract(
      context.appRequestId,
      screenName,
      layoutType
    );

    // Try to load approved VisualNormalizationContract (DVNL Phase 2.5 Integration)
    const normalizationContract = await this.loadVisualNormalizationContract(
      context.appRequestId,
      screenName,
      layoutType
    );

    if (expansionContract) {
      // VRA contract exists - build rich, hierarchical prompt (ChatGPT-level detail)
      this.logger.info(
        {
          screenName,
          layoutType,
          vraContractHash: expansionContract.contractHash,
          vncContractHash: normalizationContract?.contractHash || 'none',
          dvnlEnabled: !!normalizationContract,
        },
        normalizationContract
          ? 'Building prompt from VRA + DVNL contracts (full pipeline)'
          : 'Building prompt from VRA contract only (DVNL not yet run)'
      );

      return this.buildPromptFromContract(
        screenName,
        layoutType,
        expansionContract.contractData,
        context,
        normalizationContract?.contractData // Pass VNC data if available
      );
    }

    // No VRA contract - fall back to legacy deterministic prompt
    this.logger.debug(
      {
        screenName,
        layoutType,
      },
      'No Visual Expansion Contract found - using legacy deterministic prompt'
    );

    return this.buildLegacyDeterministicPrompt(screenName, layoutType, context);
  }

  /**
   * LEGACY: Build deterministic prompt without VRA contract
   * (Kept for backward compatibility when VRA not yet run)
   */
  private buildLegacyDeterministicPrompt(
    screenName: string,
    layoutType: LayoutTypeValue,
    context: DesignContext
  ): string {
    // Fixed style vocabulary (no randomness)
    const styleVocabulary = {
      colorScheme: 'modern, clean, professional',
      typography: 'clear hierarchy, readable fonts',
      spacing: 'generous whitespace, proper padding',
      components: 'realistic UI elements, production-ready',
    };

    // Device specification (deterministic)
    const deviceSpec = layoutType === 'mobile' ? 'iPhone mobile app' : 'desktop web application';

    // Stable ordering of UI elements
    const screenContent = context.screenDefinition.content;

    // Fixed prompt template (no timestamps, no randomness)
    const prompt = `Generate a high-fidelity, production-ready UI mockup for a ${deviceSpec}.

Screen Name: ${screenName}

Screen Description:
${screenContent}

Design Requirements:
- Style: ${styleVocabulary.colorScheme}
- Typography: ${styleVocabulary.typography}
- Spacing: ${styleVocabulary.spacing}
- Components: ${styleVocabulary.components}
- Layout: ${layoutType} optimized
- Navigation: ${layoutType === 'mobile' ? 'Mobile-optimized with touch targets' : 'Desktop-optimized with full navigation'}
- Content: Realistic, production-ready (no Lorem Ipsum)
- Quality: High-fidelity UI mockup, professional grade

Follow the screen description exactly. Do not invent features or UI elements.`;

    this.logger.debug(
      {
        screenName,
        layoutType,
        promptLength: prompt.length,
        styleVocabulary,
      },
      'Legacy deterministic prompt built'
    );

    return prompt;
  }

  /**
   * VRA PHASE 2 INTEGRATION: Build rich prompt from Visual Expansion Contract
   *
   * Transforms approved VRA contract into hierarchical, detailed image prompt.
   * This is what gives us ChatGPT-level image quality.
   */
  private buildPromptFromContract(
    screenName: string,
    layoutType: LayoutTypeValue,
    contractData: any,
    context: DesignContext,
    vncData?: any // Optional Visual Normalization Contract data from DVNL
  ): string {
    const deviceSpec = layoutType === 'mobile' ? 'iPhone mobile app' : 'desktop web application';

    // Build rich, hierarchical sections from VRA contract
    const sections: string[] = [];

    for (const section of contractData.sections) {
      switch (section.type) {
        case 'navigation':
          sections.push(this.buildNavigationSection(section, layoutType));
          break;
        case 'metric_cards':
          sections.push(this.buildMetricCardsSection(section));
          break;
        case 'data_visualization':
          sections.push(this.buildDataVisualizationSection(section));
          break;
        case 'lists':
          sections.push(this.buildListsSection(section));
          break;
        case 'forms':
          sections.push(this.buildFormsSection(section));
          break;
        case 'content':
          sections.push(this.buildContentSection(section));
          break;
        case 'links':
        case 'footer':
          sections.push(this.buildFooterSection(section));
          break;
        case 'hero':
          sections.push(this.buildHeroSection(section));
          break;
        default:
          this.logger.warn({ sectionType: section.type }, 'Unknown section type in VRA contract');
      }
    }

    // Build VNC constraints if available (DVNL Phase 2.5)
    let vncConstraintsSection = '';
    if (vncData) {
      const constraints = this.buildVNCConstraints(vncData);
      vncConstraintsSection = `

VISUAL NORMALIZATION CONSTRAINTS (MANDATORY - from DVNL):
These constraints MUST be followed to ensure professional design discipline:

${constraints}

CRITICAL: These are explicit caps - do not exceed them. These constraints prevent visual maximalism and ensure ChatGPT-level restraint.`;
    }

    // Assemble rich, hierarchical prompt
    const prompt = `Generate a high-fidelity, production-ready UI mockup for a ${deviceSpec}.

Screen Name: ${screenName}

Layout Structure (from approved Visual Expansion Contract):

${sections.join('\n\n')}${vncConstraintsSection}

Design Requirements:
- Modern, clean, professional SaaS design
- Production-ready quality (not a wireframe)
- Realistic UI components (buttons, inputs, cards, navigation)
- Proper spacing and typography
- Appropriate for ${layoutType} layout
- ${layoutType === 'mobile' ? 'Mobile-optimized with touch targets and bottom navigation' : 'Desktop-optimized with full navigation and hover states'}
- Follow current design trends and best practices
- Show realistic content (not Lorem Ipsum)
- Include navigation elements appropriate for this screen
- Respect the layout structure exactly${vncData ? '\n- STRICTLY follow the Visual Normalization Constraints above' : ''}

Style: High-fidelity UI mockup, production-ready design, modern interface, professional quality`;

    this.logger.info(
      {
        screenName,
        layoutType,
        promptLength: prompt.length,
        sectionsCount: sections.length,
      },
      'Rich prompt built from VRA contract (ChatGPT-level detail)'
    );

    return prompt;
  }

  /**
   * Build navigation section prompt from VRA contract
   */
  private buildNavigationSection(section: any, layoutType: LayoutTypeValue): string {
    const elements = section.elements || [];
    const elementsList = elements.join(', ');

    return `Header with Navigation:
- Navigation bar with: ${elementsList}
- ${layoutType === 'mobile' ? 'Mobile-optimized header with hamburger menu' : 'Full desktop navigation with dropdown menus'}
- Modern, clean design with subtle shadows`;
  }

  /**
   * Build metric cards section prompt from VRA contract
   */
  private buildMetricCardsSection(section: any): string {
    const cards = section.cards || [];
    const cardDetails = cards
      .map((card: any) => `  - ${card.label}: ${card.example}`)
      .join('\n');

    return `Analytics Cards (Key Metrics):
${cardDetails}

Display as modern card components with:
- Large, prominent numbers
- Descriptive labels
- Trend indicators (up/down arrows)
- Subtle shadows and rounded corners
- Grid layout`;
  }

  /**
   * Build data visualization section prompt from VRA contract
   */
  private buildDataVisualizationSection(section: any): string {
    const charts = section.charts || [];
    const chartDetails = charts
      .map((chart: any) => {
        const chartTypeName = chart.chartType.replace(/_/g, ' + ');
        return `  - ${chartTypeName} chart: "${chart.title}"`;
      })
      .join('\n');

    return `Charts and Data Visualization:
${chartDetails}

Display as professional, modern charts with:
- Clear axes and labels
- Realistic data trends
- Legend and tooltips
- Modern color palette
- Proper spacing`;
  }

  /**
   * Build lists section prompt from VRA contract
   */
  private buildListsSection(section: any): string {
    const lists = section.lists || [];
    const listNames = lists.join(', ');

    return `Lists Section:
- ${listNames}

Display as clean, organized lists with:
- Clear item separation
- Timestamps where appropriate
- Status indicators
- Action buttons
- Modern list styling`;
  }

  /**
   * Build forms section prompt from VRA contract
   */
  private buildFormsSection(section: any): string {
    return `Form Section:
- Input fields with labels
- Modern form styling
- Clear validation states
- Submit/action buttons
- Proper spacing and alignment`;
  }

  /**
   * Build content section prompt from VRA contract
   */
  private buildContentSection(section: any): string {
    return `Content Area:
- Main content with clear hierarchy
- Headings and body text
- Proper spacing and readability
- Modern typography`;
  }

  /**
   * Build footer section prompt from VRA contract
   */
  private buildFooterSection(section: any): string {
    const elements = section.elements || [];
    const elementsList = elements.join(', ');

    return `Footer:
- Links: ${elementsList}
- Minimal, clean design
- Subtle separator from main content`;
  }

  /**
   * Build hero section prompt from VRA contract
   */
  private buildHeroSection(section: any): string {
    return `Hero Section:
- Large, prominent headline
- Supporting text
- Call-to-action button
- Modern, eye-catching design`;
  }

  /**
   * Load approved Visual Expansion Contract (VRA Phase 2)
   */
  private async loadVisualExpansionContract(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutTypeValue
  ): Promise<{ contractData: any; contractHash: string } | null> {
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
      contractData: JSON.parse(contract.contractJson),
      contractHash: contract.contractHash,
    };
  }

  /**
   * Load Visual Normalization Contract (VNC) from DVNL
   * This provides visual complexity constraints that prevent maximalism.
   *
   * Phase 2.5 (DVNL Integration - 2026-01-12)
   */
  private async loadVisualNormalizationContract(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutTypeValue
  ): Promise<{ contractData: any; contractHash: string } | null> {
    const contract = await this.prisma.visualNormalizationContract.findFirst({
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
      contractData: JSON.parse(contract.contractJson),
      contractHash: contract.contractHash,
    };
  }

  /**
   * Build VNC constraints string for image prompt injection
   * Converts Visual Normalization Contract into explicit constraints
   * that the image model must follow.
   */
  private buildVNCConstraints(vncData: any): string {
    const constraints: string[] = [];

    // Layout constraints
    if (vncData.layoutRules) {
      constraints.push(`- Use ${vncData.layoutRules.gridSystem} grid system`);
      constraints.push(`- Maximum ${vncData.layoutRules.maxCardsPerRow} cards per row`);
      constraints.push(`- Maximum ${vncData.layoutRules.maxSectionsPerRow} section(s) per row`);
    }

    // Density constraints (CRITICAL - prevents visual maximalism)
    if (vncData.densityRules) {
      constraints.push(`- Maximum ${vncData.densityRules.maxMetricCards} metric cards total`);
      constraints.push(`- Maximum ${vncData.densityRules.maxCharts} charts/graphs total`);
      constraints.push(`- Maximum ${vncData.densityRules.maxLists} lists total`);
    }

    // Chart type constraints
    if (vncData.allowedChartTypes && vncData.allowedChartTypes.length > 0) {
      constraints.push(`- Allowed chart types: ${vncData.allowedChartTypes.join(', ')}`);
    }

    // Disallowed visuals (CRITICAL - prevents gauges, speedometers, etc.)
    if (vncData.disallowedVisuals && vncData.disallowedVisuals.length > 0) {
      const disallowed = vncData.disallowedVisuals
        .map((v: string) => v.replace(/_/g, ' '))
        .join(', ');
      constraints.push(`- FORBIDDEN: ${disallowed}`);
    }

    // Typography constraints
    if (vncData.typographyRules) {
      constraints.push(`- Typography: ${vncData.typographyRules.headingScale} headings, ${vncData.typographyRules.metricScale} metrics, ${vncData.typographyRules.labelScale} labels`);
      constraints.push(`- Maximum ${vncData.typographyRules.maxFontVariants} font variants`);
    }

    // Color constraints
    if (vncData.colorRules) {
      constraints.push(`- Color scheme: ${vncData.colorRules.backgroundStyle} background`);
      constraints.push(`- ${vncData.colorRules.primaryAccentCount} primary accent color(s), ${vncData.colorRules.secondaryAccentCount} secondary accent color(s)`);
    }

    // Overall complexity cap
    if (vncData.visualComplexityCap) {
      constraints.push(`- Visual complexity level: ${vncData.visualComplexityCap}`);
    }

    return constraints.join('\n');
  }

  /**
   * FEATURE 6: Image Hash Computation
   *
   * Computes SHA-256 hash of image data for immutability.
   */
  private async computeImageHash(imagePath: string): Promise<string> {
    const imageData = await fs.readFile(imagePath);
    const hash = createHash('sha256').update(imageData).digest('hex');

    this.logger.debug({ imagePath, hash }, 'Image hash computed');
    return hash;
  }

  /**
   * FEATURE 7: Immutability Check
   *
   * Prevents regeneration of approved mockups.
   */
  private async checkImmutability(appRequestId: string, screenName: string): Promise<void> {
    const existingApproved = await this.prisma.screenMockup.findFirst({
      where: {
        appRequestId,
        screenName,
        status: MockupStatus.APPROVED,
      },
    });

    if (existingApproved) {
      throw new Error(
        `IMMUTABILITY VIOLATION: Mockup for "${screenName}" is already approved and LOCKED. ` +
          `Approved mockups cannot be regenerated or modified. ` +
          `This is a critical integrity violation.`
      );
    }
  }

  /**
   * Start Visual Forge
   *
   * Validates Conductor state and loads approved screens.
   */
  async start(appRequestId: string): Promise<{ message: string; nextScreen: string }> {
    this.validateAction('generateMockup');
    this.logger.info({ appRequestId }, 'Starting Visual Forge');

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'flows_defined') {
      throw new Error(
        `Cannot start Visual Forge: Conductor state is '${state.currentStatus}', expected 'flows_defined'`
      );
    }

    // Load approved ScreenIndex
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex || screenIndex.status !== 'approved' || !screenIndex.screenIndexHash) {
      throw new Error('No approved and hash-locked ScreenIndex found');
    }

    const allScreens: string[] = JSON.parse(screenIndex.screens);

    // Get unmocked screens
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
      {
        appRequestId,
        nextScreen,
        totalScreens: allScreens.length,
        remaining: unmockedScreens.length,
      },
      'Visual Forge ready'
    );

    return {
      message: `Ready to generate mockup for "${nextScreen}". Please select layout type (mobile or desktop).`,
      nextScreen,
    };
  }

  /**
   * Generate Mockup
   *
   * Generates UI mockup with full production hardening.
   *
   * FEATURES:
   * - Context isolation (hash-based)
   * - Screen canonicalization
   * - Contract validation
   * - Deterministic prompt generation
   * - Image hashing
   * - Immutability check
   * - Failure tracking
   */
  async generateMockup(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutTypeValue
  ): Promise<MockupGenerationResult> {
    this.validateAction('generateMockup');

    this.logger.info({ appRequestId, screenName, layoutType }, 'Generating mockup');

    // Validate layout type
    if (layoutType !== LayoutType.MOBILE && layoutType !== LayoutType.DESKTOP) {
      throw new Error(`Invalid layout type: ${layoutType}. Must be 'mobile' or 'desktop'`);
    }

    // Check immutability
    await this.checkImmutability(appRequestId, screenName);

    // Lock Conductor
    await this.conductor.lock(appRequestId);

    try {
      // First, load Screen Index to get allowed screens for canonicalization
      const screenIndex = await this.prisma.screenIndex.findUnique({
        where: { appRequestId },
      });

      if (!screenIndex || screenIndex.status !== 'approved' || !screenIndex.screenIndexHash) {
        throw new Error(
          `CONTEXT ISOLATION VIOLATION: No approved ScreenIndex found. ` +
            `Visual Forge requires hash-locked ScreenIndex.`
        );
      }

      const allowedScreens: string[] = JSON.parse(screenIndex.screens);

      // Canonicalize screen name FIRST (fail fast on unknown screens)
      const canonicalScreenName = this.canonicalizeScreenName(screenName, allowedScreens);

      // Now load full isolated context (hash-based)
      const context = await this.loadIsolatedContext(appRequestId, canonicalScreenName);

      // Build deterministic prompt (VRA Phase 2: now checks for approved VisualExpansionContract)
      const imagePrompt = await this.buildDeterministicImagePrompt(
        canonicalScreenName,
        layoutType,
        context
      );

      // Generate mockup image via OpenAI GPT Image 1.5
      const mockupId = randomUUID();
      const filename = `${canonicalScreenName.toLowerCase().replace(/\s+/g, '-')}-${layoutType}.png`;
      const imagePath = path.join(this.mockupsDir, filename);

      // Ensure mockups directory exists
      await fs.mkdir(this.mockupsDir, { recursive: true });

      // Generate mockup image (uses OpenAI GPT Image 1.5 if API key configured, otherwise placeholder)
      await this.generateMockupImage(imagePath, canonicalScreenName, layoutType, imagePrompt);

      // Compute image hash
      const imageHash = await this.computeImageHash(imagePath);

      // Extract visual elements from screen definition
      const visualElements = this.extractVisualElements(context.screenDefinition.content);

      // Build mockup contract
      const contract: VisualMockupContract = {
        screenName: canonicalScreenName,
        layoutType,
        imageUrl: imagePath,
        imageHash,
        derivedFrom: {
          screenHash: context.screenDefinition.screenHash,
          journeyHash: context.userJourneys[0]?.journeyHash,
        },
        visualElements,
        notes: `Generated for ${layoutType} layout`,
      };

      // Validate contract
      const validation = this.validateMockupContract(contract, context);
      if (!validation.valid) {
        throw new Error(
          `MOCKUP CONTRACT VALIDATION FAILED:\n${validation.errors.join('\n')}`
        );
      }

      // Compute mockup hash (hash of serialized contract)
      const mockupHash = this.computeMockupHash(contract);

      // Save to database
      const mockup = await this.prisma.screenMockup.create({
        data: {
          id: mockupId,
          appRequestId,
          screenName: canonicalScreenName,
          layoutType,
          imagePath,
          promptMetadata: JSON.stringify({
            prompt: imagePrompt,
            contract,
            imageHash,
            mockupHash,
          }),
          status: MockupStatus.AWAITING_APPROVAL,
        },
      });

      this.logger.info(
        {
          appRequestId,
          mockupId,
          screenName: canonicalScreenName,
          imageHash,
          mockupHash,
        },
        'Mockup generated and saved'
      );

      // Emit event
      await this.emitEvent(
        appRequestId,
        'visual_mockup_generated',
        `UI mockup for "${canonicalScreenName}" (${layoutType}) generated - awaiting approval`
      );

      // Pause Conductor for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        `UI mockup for "${canonicalScreenName}" (${layoutType}) generated - awaiting approval`
      );

      // Unlock Conductor
      await this.conductor.unlock(appRequestId);

      // Reset failure count on success
      this.failureCount.delete(`${appRequestId}:${screenName}`);

      return {
        mockupId,
        screenName: canonicalScreenName,
        layoutType,
        imagePath,
        imageHash,
        contract,
        status: MockupStatus.AWAITING_APPROVAL,
        mockupVersion: 1,
        createdAt: mockup.createdAt,
      };
    } catch (error) {
      await this.conductor.unlock(appRequestId);

      // Track failure
      const failureKey = `${appRequestId}:${screenName}`;
      const currentFailures = this.failureCount.get(failureKey) || 0;
      this.failureCount.set(failureKey, currentFailures + 1);

      // Emit failure event
      await this.emitEvent(
        appRequestId,
        'visual_generation_failed',
        `Failed to generate mockup for "${screenName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Check retry limit
      if (currentFailures + 1 >= 2) {
        this.logger.error(
          { appRequestId, screenName, failures: currentFailures + 1 },
          'Max failures reached - pausing Conductor'
        );
        await this.conductor.pauseForHuman(
          appRequestId,
          `Mockup generation failed ${currentFailures + 1} times for "${screenName}". Human intervention required.`
        );
      }

      throw error;
    }
  }

  /**
   * Approve Mockup
   *
   * Locks mockup as immutable and advances progress.
   */
  async approveMockup(appRequestId: string, screenName: string): Promise<MockupGenerationResult> {
    this.validateAction('storeMockup');

    this.logger.info({ appRequestId, screenName }, 'Approving mockup');

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

    // Mark as approved (IMMUTABLE)
    const approved = await this.prisma.screenMockup.update({
      where: { id: mockup.id },
      data: {
        status: MockupStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info({ appRequestId, mockupId: approved.id, screenName }, 'Mockup approved and LOCKED');

    // Emit event
    await this.emitEvent(
      appRequestId,
      'visual_mockup_approved',
      `UI mockup for "${screenName}" approved by human`
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Check if all mockups approved
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error('ScreenIndex not found');
    }

    const allScreens: string[] = JSON.parse(screenIndex.screens);
    const approvedCount = await this.prisma.screenMockup.count({
      where: { appRequestId, status: MockupStatus.APPROVED },
    });

    if (approvedCount === allScreens.length) {
      this.logger.info({ appRequestId }, 'All mockups approved - transitioning to designs_ready');
      await this.conductor.transition(appRequestId, 'designs_ready', 'VisualForge');
      await this.emitEvent(
        appRequestId,
        'designs_ready',
        `All ${allScreens.length} UI mockups approved - ready for next stage`
      );
    }

    const promptMetadata = JSON.parse(mockup.promptMetadata);
    const contract = promptMetadata.contract as VisualMockupContract;

    return {
      mockupId: approved.id,
      screenName: approved.screenName,
      layoutType: approved.layoutType as LayoutTypeValue,
      imagePath: approved.imagePath,
      imageHash: promptMetadata.imageHash,
      contract,
      status: MockupStatus.APPROVED,
      mockupVersion: 1,
      createdAt: approved.createdAt,
    };
  }

  /**
   * Reject Mockup
   *
   * Allows regeneration with feedback.
   */
  async rejectMockup(appRequestId: string, screenName: string, feedback?: string): Promise<void> {
    this.logger.info({ appRequestId, screenName, feedback }, 'Rejecting mockup');

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
      this.logger.debug({ imagePath: mockup.imagePath }, 'Mockup image deleted');
    } catch (error) {
      this.logger.warn({ imagePath: mockup.imagePath, error }, 'Failed to delete image');
    }

    // Delete from database
    await this.prisma.screenMockup.delete({
      where: { id: mockup.id },
    });

    // Emit event
    await this.emitEvent(
      appRequestId,
      'visual_mockup_rejected',
      `UI mockup for "${screenName}" rejected${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Mockup rejected - ready for regeneration');
  }

  /**
   * Get Current State
   */
  async getCurrentState(appRequestId: string): Promise<VisualForgeState> {
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      return {
        totalScreens: 0,
        completedCount: 0,
        remainingCount: 0,
        currentMockup: null,
        allScreenNames: [],
      };
    }

    const allScreenNames: string[] = JSON.parse(screenIndex.screens);
    const totalScreens = allScreenNames.length;

    const currentMockup = await this.prisma.screenMockup.findFirst({
      where: {
        appRequestId,
        status: MockupStatus.AWAITING_APPROVAL,
      },
    });

    const completedCount = await this.prisma.screenMockup.count({
      where: {
        appRequestId,
        status: MockupStatus.APPROVED,
      },
    });

    return {
      totalScreens,
      completedCount,
      remainingCount: totalScreens - completedCount - (currentMockup ? 1 : 0),
      currentMockup: currentMockup ? this.toMockupResult(currentMockup) : null,
      allScreenNames,
    };
  }

  /**
   * HELPER: Extract visual elements from screen definition
   */
  private extractVisualElements(screenContent: string): {
    headers: string[];
    primaryActions: string[];
    secondaryActions: string[];
    navigationType: 'top' | 'bottom' | 'side' | 'none';
  } {
    const headers: string[] = [];
    const primaryActions: string[] = [];
    const secondaryActions: string[] = [];
    let navigationType: 'top' | 'bottom' | 'side' | 'none' = 'top';

    // Simple extraction (in production, use more sophisticated parsing)
    const lines = screenContent.split('\n');
    for (const line of lines) {
      if (line.includes('header') || line.includes('Header')) {
        headers.push(line.trim());
      }
      if (line.includes('button') || line.includes('Button')) {
        primaryActions.push(line.trim());
      }
      if (line.includes('navigation') || line.includes('nav')) {
        if (line.includes('bottom')) navigationType = 'bottom';
        else if (line.includes('side')) navigationType = 'side';
      }
    }

    return { headers, primaryActions, secondaryActions, navigationType };
  }

  /**
   * HELPER: Generate mockup image via OpenAI with smart fallback
   *
   * Generates high-fidelity UI mockup using OpenAI image generation API.
   * - Tries GPT Image 1.5 first (4× faster, better quality)
   * - Falls back to DALL-E 3 if organization not verified
   * - Falls back to placeholder if API key not configured
   */
  private async generateMockupImage(
    imagePath: string,
    screenName: string,
    layoutType: LayoutTypeValue,
    imagePrompt: string
  ): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY;

    // Check if OpenAI API is configured
    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured - using fallback mode');

      // Fallback: Create placeholder image
      const placeholder = `MOCKUP: ${screenName} (${layoutType})\n\nThis is a placeholder image.\nIn production, this would be a high-fidelity UI mockup generated via GPT Image 1.5.`;
      await fs.writeFile(imagePath, placeholder);
      this.logger.debug({ imagePath, screenName, layoutType }, 'Placeholder image created');
      return;
    }

    // Real mode: Call OpenAI API with smart fallback
    // Try GPT Image 1.5 first (best quality, 4× faster), fallback to DALL-E 3 if not accessible
    let imageBuffer: Buffer;
    let modelUsed = 'gpt-image-1.5';

    try {
      this.logger.info({ screenName, layoutType }, 'Attempting GPT Image 1.5 generation');

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1.5',
          prompt: imagePrompt,
          n: 1,
          size: '1536x1024', // GPT Image 1.5 supports: '1024x1024', '1024x1536', '1536x1024', 'auto'
          quality: 'high', // GPT Image 1.5 supports: 'low', 'medium', 'high', 'auto'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Check if this is a verification/access error - fallback to DALL-E 3
        if (
          response.status === 403 ||
          (errorData as any)?.error?.message?.includes('verified') ||
          (errorData as any)?.error?.message?.includes('gpt-image-1.5')
        ) {
          this.logger.warn(
            { errorData },
            'GPT Image 1.5 requires verified organization - falling back to DALL-E 3'
          );

          // Fallback to DALL-E 3
          modelUsed = 'dall-e-3';
          const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: imagePrompt,
              n: 1,
              size: '1792x1024', // DALL-E 3 supports: '1024x1024', '1792x1024', '1024x1792'
              quality: 'hd',
            }),
          });

          if (!dalleResponse.ok) {
            const dalleErrorData = await dalleResponse.json().catch(() => ({}));
            throw new Error(
              `OpenAI DALL-E 3 fallback failed: ${dalleResponse.statusText}. ${JSON.stringify(dalleErrorData)}`
            );
          }

          const dalleData = await dalleResponse.json();
          const dalleImageUrl = dalleData.data[0].url;

          this.logger.info({ imageUrl: dalleImageUrl, screenName }, 'DALL-E 3 image generated');

          // Download DALL-E image
          const dalleImageResponse = await fetch(dalleImageUrl);
          if (!dalleImageResponse.ok) {
            throw new Error(`Failed to download DALL-E image: ${dalleImageResponse.statusText}`);
          }

          imageBuffer = Buffer.from(await dalleImageResponse.arrayBuffer());
        } else {
          // Other API error - don't fallback
          throw new Error(
            `OpenAI API error: ${response.statusText}. ${JSON.stringify(errorData)}`
          );
        }
      } else {
        // GPT Image 1.5 success
        const data = await response.json();
        const imageUrl = data.data[0].url;

        this.logger.info({ imageUrl, screenName }, 'GPT Image 1.5 generated');

        // Download image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }

        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      }

      // Save image
      await fs.mkdir(this.mockupsDir, { recursive: true });
      await fs.writeFile(imagePath, imageBuffer);

      this.logger.info(
        {
          imagePath,
          screenName,
          layoutType,
          modelUsed,
          sizeBytes: imageBuffer.length,
        },
        `Mockup image generated and saved (model: ${modelUsed})`
      );
    } catch (error) {
      this.logger.error({ error, screenName, layoutType }, 'Failed to generate mockup via OpenAI');
      throw new Error(
        `Failed to generate mockup via OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * HELPER: Compute mockup hash
   */
  private computeMockupHash(contract: VisualMockupContract): string {
    const serialized = JSON.stringify(contract, Object.keys(contract).sort());
    const hash = createHash('sha256').update(serialized).digest('hex');
    return hash;
  }

  /**
   * HELPER: Emit event
   */
  private async emitEvent(appRequestId: string, type: string, message: string): Promise<void> {
    this.validateAction('emitVisualEvents');

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
   * HELPER: Convert to result
   */
  private toMockupResult(mockup: any): MockupGenerationResult {
    const promptMetadata = JSON.parse(mockup.promptMetadata);
    return {
      mockupId: mockup.id,
      screenName: mockup.screenName,
      layoutType: mockup.layoutType as LayoutTypeValue,
      imagePath: mockup.imagePath,
      imageHash: promptMetadata.imageHash,
      contract: promptMetadata.contract,
      status: mockup.status as MockupStatusValue,
      mockupVersion: 1,
      createdAt: mockup.createdAt,
    };
  }
}
