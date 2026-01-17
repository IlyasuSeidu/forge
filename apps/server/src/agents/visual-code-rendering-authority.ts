/**
 * VISUAL CODE RENDERING AUTHORITY (VCRA)
 *
 * Constitutional Authority: VISUAL_CODE_RENDERING_AUTHORITY
 * Tier: 3.75 (Final Visual Intelligence Layer)
 *
 * PURPOSE:
 * Generates real HTML/CSS or React code from approved visual contracts (VRA, DVNL, VCA).
 * Replaces DALL-E image generation with browser-rendered screenshots of actual code.
 *
 * RESPONSIBILITIES:
 * - Generate deterministic, screenshot-ready HTML+Tailwind or React+Tailwind code
 * - Respect all upstream visual contracts (VRA, DVNL, VCA)
 * - Produce code that renders identically in headless browsers
 * - NO creative styling - only translate contracts to code
 * - NO feature invention - only code what contracts specify
 *
 * OUTPUTS:
 * 1. Visual Code Rendering Contract (VCRC) - hash-locked code specification
 * 2. Generated UI code (HTML/JSX) - deterministic, immutable
 * 3. Ready for Playwright screenshot rendering
 *
 * CONTEXT ISOLATION:
 * Requires approved contracts from:
 * - Visual Rendering Authority (VRA) - WHAT to show
 * - Deterministic Visual Normalizer (DVNL) - HOW MUCH allowed
 * - Visual Composition Authority (VCA) - HOW COMPOSED
 *
 * This is the bridge between AI design intent and real browser rendering.
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import pino from 'pino';
import { ForgeConductor } from '../conductor/forge-conductor.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Constitutional envelope for VCRA
const VISUAL_CODE_RENDERING_ENVELOPE = {
  authorityLevel: 'VISUAL_CODE_RENDERING_AUTHORITY',
  allowedActions: [
    'Generate HTML+Tailwind code from visual contracts',
    'Generate React+Tailwind code from visual contracts',
    'Define viewport dimensions',
    'Specify typography and spacing in code',
    'Create deterministic, screenshot-ready UI code',
  ],
  forbiddenActions: [
    'Invent features not in VRA contract',
    'Ignore DVNL density constraints',
    'Disregard VCA composition rules',
    'Add creative styling beyond contracts',
    'Generate non-deterministic code',
    'Access backend APIs or data sources',
    'Create interactive functionality (just visual mockup code)',
  ],
};

type LayoutType = 'desktop' | 'mobile';
type Framework = 'html-tailwind' | 'react-tailwind';

interface VisualCodeRenderingContractData {
  screenName: string;
  layoutType: LayoutType;
  framework: Framework;
  viewport: {
    width: number;
    height: number;
  };
  layoutStructure: {
    sections: {
      name: string;
      gridArea: string;
      components: string[];
    }[];
  };
  typographyRules: {
    fontFamily: string;
    baseFontSize: number;
    headingScale: string[];
  };
  spacingRules: {
    sectionGap: number;
    cardPadding: number;
    sectionSpacing: string;
  };
  generatedCode: string;
  codeGenerationRationale: string;
}

interface IsolatedContext {
  appRequestId: string;
  basePrompt: { hash: string };
  planningDocs: { hash: string };
  screenIndex: { hash: string };
  screenDefinition: { content: string; hash: string };
  visualExpansionContract: { contractData: any; contractHash: string };
  visualNormalizationContract: { contractData: any; contractHash: string };
  visualCompositionContract: { contractData: any; contractHash: string };
}

export class VisualCodeRenderingAuthority {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: pino.Logger;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: pino.Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger.child({
      agent: 'VisualCodeRenderingAuthority',
      version: '1.0.0',
      authority: VISUAL_CODE_RENDERING_ENVELOPE.authorityLevel,
    });

    this.logger.info('VisualCodeRenderingAuthority initialized');
  }

  /**
   * Main entry point: Generate UI code from approved visual contracts
   */
  async generateUICode(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType,
    framework: Framework = 'html-tailwind'
  ): Promise<string> {
    this.logger.info(
      { appRequestId, screenName, layoutType, framework },
      'Starting UI code generation'
    );

    // Validate constitutional envelope
    this.validateEnvelope();

    // Lock conductor to prevent concurrent modifications
    await this.conductor.lock(appRequestId);

    try {
      // Load isolated context (requires approved VRA, DVNL, VCA)
      const context = await this.loadIsolatedContext(appRequestId, screenName, layoutType);

      // Generate code contract via Claude
      const { contractData, generatedCode } = await this.generateCodeContract(
        context,
        screenName,
        layoutType,
        framework
      );

      // Validate contract
      this.validateContract(contractData);

      // Hash the contract and generated code
      const contractHash = this.hashContract(contractData);
      const codeHash = this.hashCode(generatedCode);

      // Save contract to database
      const contractId = await this.saveContract(
        appRequestId,
        screenName,
        layoutType,
        framework,
        contractData,
        generatedCode,
        contractHash,
        codeHash,
        context
      );

      this.logger.info(
        { appRequestId, contractId, screenName, contractHash, codeHash },
        'Visual Code Rendering Contract generated and saved'
      );

      // Pause for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        `UI code for "${screenName}" (${layoutType}) generated - awaiting approval`
      );

      return contractId;
    } finally {
      await this.conductor.unlock(appRequestId);
    }
  }

  /**
   * Approve a Visual Code Rendering Contract
   */
  async approve(contractId: string, approver: string): Promise<void> {
    const contract = await this.prisma.visualCodeRenderingContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`VCRC not found: ${contractId}`);
    }

    if (contract.status === 'approved') {
      throw new Error(`VCRC already approved: ${contractId}`);
    }

    await this.prisma.visualCodeRenderingContract.update({
      where: { id: contractId },
      data: {
        status: 'approved',
        approvedBy: approver,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      { contractId, approver, screenName: contract.screenName, contractHash: contract.contractHash },
      'Visual Code Rendering Contract approved and hash-locked'
    );

    await this.conductor.unlock(contract.appRequestId);
  }

  /**
   * Reject a Visual Code Rendering Contract
   */
  async reject(contractId: string, reason: string): Promise<void> {
    const contract = await this.prisma.visualCodeRenderingContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`VCRC not found: ${contractId}`);
    }

    await this.prisma.visualCodeRenderingContract.update({
      where: { id: contractId },
      data: {
        status: 'rejected',
      },
    });

    this.logger.info(
      { contractId, reason, screenName: contract.screenName },
      'Visual Code Rendering Contract rejected'
    );

    await this.conductor.unlock(contract.appRequestId);
  }

  /**
   * Validate constitutional envelope
   */
  private validateEnvelope(): void {
    // VCRA must only generate code from approved contracts
    // No feature invention, no styling creativity
    if (!VISUAL_CODE_RENDERING_ENVELOPE.authorityLevel) {
      throw new Error('ENVELOPE_VALIDATION_FAILED: Invalid authority level');
    }
  }

  /**
   * Load isolated context - requires approved VRA, DVNL, VCA contracts
   */
  private async loadIsolatedContext(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType
  ): Promise<IsolatedContext> {
    this.logger.info({ appRequestId, screenName }, 'Loading isolated context');

    // Get approved Foundry Session
    const foundrySession = await this.prisma.foundrySession.findFirst({
      where: {
        appRequestId,
        status: 'approved',
      },
      orderBy: {
        approvedAt: 'desc',
      },
    });

    if (!foundrySession) {
      throw new Error('CONTEXT_ISOLATION_VIOLATION: No approved Foundry Session found');
    }

    // Get approved Planning Documents
    const masterPlan = await this.prisma.planningDocument.findFirst({
      where: {
        appRequestId,
        type: 'MASTER_PLAN',
        status: 'approved',
      },
    });

    const implPlan = await this.prisma.planningDocument.findFirst({
      where: {
        appRequestId,
        type: 'IMPLEMENTATION_PLAN',
        status: 'approved',
      },
    });

    if (!masterPlan || !implPlan) {
      throw new Error('CONTEXT_ISOLATION_VIOLATION: Missing approved planning documents');
    }

    // Get approved Screen Index
    const screenIndex = await this.prisma.screenIndex.findFirst({
      where: {
        appRequestId,
        status: 'approved',
      },
    });

    if (!screenIndex) {
      throw new Error('CONTEXT_ISOLATION_VIOLATION: No approved Screen Index found');
    }

    // Get approved Screen Definition
    const screenDefinition = await this.prisma.screenDefinition.findFirst({
      where: {
        appRequestId,
        screenName,
        status: 'approved',
      },
    });

    if (!screenDefinition) {
      throw new Error(`CONTEXT_ISOLATION_VIOLATION: No approved Screen Definition for "${screenName}"`);
    }

    // Get approved VRA contract
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

    if (!vraContract) {
      throw new Error(`CONTEXT_ISOLATION_VIOLATION: No approved VRA contract for "${screenName}"`);
    }

    // Get approved DVNL contract
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

    if (!dvnlContract) {
      throw new Error(`CONTEXT_ISOLATION_VIOLATION: No approved DVNL contract for "${screenName}"`);
    }

    // Get approved VCA contract
    const vcaContract = await this.prisma.visualCompositionContract.findFirst({
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

    if (!vcaContract) {
      throw new Error(`CONTEXT_ISOLATION_VIOLATION: No approved VCA contract for "${screenName}"`);
    }

    const planningDocsHash = this.hashString(
      masterPlan.documentHash! + implPlan.documentHash!
    );

    return {
      appRequestId,
      basePrompt: { hash: foundrySession.basePromptHash! },
      planningDocs: { hash: planningDocsHash },
      screenIndex: { hash: screenIndex.screenIndexHash! },
      screenDefinition: {
        content: screenDefinition.content,
        hash: screenDefinition.screenHash!,
      },
      visualExpansionContract: {
        contractData: JSON.parse(vraContract.contractJson),
        contractHash: vraContract.contractHash,
      },
      visualNormalizationContract: {
        contractData: JSON.parse(dvnlContract.contractJson),
        contractHash: dvnlContract.contractHash,
      },
      visualCompositionContract: {
        contractData: JSON.parse(vcaContract.contractJson),
        contractHash: vcaContract.contractHash,
      },
    };
  }

  /**
   * Generate code contract via Claude API
   */
  private async generateCodeContract(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType,
    framework: Framework
  ): Promise<{ contractData: VisualCodeRenderingContractData; generatedCode: string }> {
    this.logger.info({ screenName, layoutType, framework }, 'Generating UI code via Claude API');

    const prompt = this.buildCodeGenerationPrompt(context, screenName, layoutType, framework);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.3, // Slightly higher for code generation creativity within constraints
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0]!;
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const textContent = (content as { type: 'text'; text: string }).text;

    // Parse response - expecting JSON with contract data + generated code
    let parsedResponse;
    try {
      const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]!);
      } else {
        parsedResponse = JSON.parse(textContent);
      }
    } catch (error) {
      this.logger.error({ response: textContent }, 'Failed to parse Claude response');
      throw new Error('Failed to parse code generation response');
    }

    const viewport = layoutType === 'desktop' ? { width: 1440, height: 1024 } : { width: 375, height: 812 };

    const contractData: VisualCodeRenderingContractData = {
      screenName,
      layoutType,
      framework,
      viewport,
      layoutStructure: parsedResponse.layoutStructure,
      typographyRules: parsedResponse.typographyRules,
      spacingRules: parsedResponse.spacingRules,
      generatedCode: parsedResponse.generatedCode,
      codeGenerationRationale: parsedResponse.codeGenerationRationale,
    };

    this.logger.info(
      { screenName, layoutType, codeLength: parsedResponse.generatedCode.length },
      'UI code generated'
    );

    return {
      contractData,
      generatedCode: parsedResponse.generatedCode,
    };
  }

  /**
   * Build code generation prompt for Claude
   */
  private buildCodeGenerationPrompt(
    context: IsolatedContext,
    screenName: string,
    layoutType: LayoutType,
    framework: Framework
  ): string {
    const vraContract = context.visualExpansionContract.contractData;
    const dvnlContract = context.visualNormalizationContract.contractData;
    const vcaContract = context.visualCompositionContract.contractData;

    return `You are the Visual Code Rendering Authority (VCRA) for the Forge AI application factory.

YOUR ROLE:
Generate production-ready ${framework === 'html-tailwind' ? 'HTML + Tailwind CSS' : 'React JSX + Tailwind CSS'} code
for a UI mockup that will be rendered in a headless browser and screenshotted.

## CONTEXT: WHY THIS MATTERS

This code will be:
1. Rendered in Playwright/Puppeteer headless browser
2. Screenshot for human approval
3. Used as the starting point for production implementation

The code must be:
- Screenshot-ready (renders perfectly in a browser)
- Deterministic (same code every time for same inputs)
- Faithful to all visual contracts
- Production-quality structure

## YOUR CONSTRAINTS (CRITICAL - YOU MUST RESPECT ALL UPSTREAM CONTRACTS)

### VRA Contract (WHAT EXISTS):
${JSON.stringify(vraContract, null, 2)}

### DVNL Contract (HOW MUCH ALLOWED):
${JSON.stringify(dvnlContract, null, 2)}

### VCA Contract (HOW COMPOSED):
${JSON.stringify(vcaContract, null, 2)}

## YOUR TASK

Generate ${framework === 'html-tailwind' ? 'complete HTML with Tailwind CSS' : 'complete React component with Tailwind CSS'} that:

1. Implements ALL sections from VRA contract
2. Respects ALL density caps from DVNL contract
3. Follows ALL composition rules from VCA contract
4. Uses realistic, professional UI components
5. Renders perfectly in a ${layoutType} viewport (${layoutType === 'desktop' ? '1440x1024' : '375x812'})
6. Has clear, readable text (not blurry, not decorative)
7. Looks like a real application screenshot

## CODE REQUIREMENTS

${framework === 'html-tailwind' ? `
- Complete HTML5 document with <!DOCTYPE html>
- Include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Use semantic HTML tags
- Add realistic content (no Lorem Ipsum)
- Use Tailwind utility classes for all styling
- No custom CSS - only Tailwind
` : `
- Single React component (functional component with hooks if needed)
- Use Tailwind utility classes
- Import any needed icons from lucide-react if needed
- Add realistic content
- No external CSS files - only Tailwind
`}

## OUTPUT FORMAT (REQUIRED)

Respond with ONLY valid JSON in this exact format:

\`\`\`json
{
  "layoutStructure": {
    "sections": [
      {
        "name": "header-navigation",
        "gridArea": "1 / 1 / 2 / 13",
        "components": ["logo", "search", "cart"]
      }
    ]
  },
  "typographyRules": {
    "fontFamily": "Inter, system-ui, sans-serif",
    "baseFontSize": 16,
    "headingScale": ["text-4xl", "text-2xl", "text-xl"]
  },
  "spacingRules": {
    "sectionGap": 32,
    "cardPadding": 24,
    "sectionSpacing": "medium"
  },
  "generatedCode": "<!DOCTYPE html>\\n<html>\\n...</html>",
  "codeGenerationRationale": "Generated clean HTML structure with Tailwind utilities, following VRA sections, DVNL caps, and VCA composition..."
}
\`\`\`

CRITICAL RULES:
- Escape all newlines and quotes in generatedCode string
- Include COMPLETE working code (not snippets)
- Code must be copy-paste ready
- No placeholder comments like <!-- Content here -->
- Use real, professional UI component patterns
- Text must be legible and professional

Screen Name: ${screenName}
Layout Type: ${layoutType}
Framework: ${framework}

Generate the code now.`;
  }

  /**
   * Validate contract structure
   */
  private validateContract(contractData: VisualCodeRenderingContractData): void {
    if (!contractData.screenName) {
      throw new Error('Invalid contract: missing screenName');
    }

    if (!contractData.layoutType) {
      throw new Error('Invalid contract: missing layoutType');
    }

    if (!contractData.generatedCode) {
      throw new Error('Invalid contract: missing generatedCode');
    }

    if (!contractData.layoutStructure || !contractData.layoutStructure.sections) {
      throw new Error('Invalid contract: missing layoutStructure');
    }

    if (contractData.generatedCode.length < 100) {
      throw new Error('Invalid contract: generatedCode too short (likely incomplete)');
    }
  }

  /**
   * Hash contract for immutability
   */
  private hashContract(contractData: VisualCodeRenderingContractData): string {
    const contractString = JSON.stringify(contractData, Object.keys(contractData).sort());
    return createHash('sha256').update(contractString).digest('hex');
  }

  /**
   * Hash generated code separately
   */
  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  /**
   * Hash a string
   */
  private hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Save contract to database
   */
  private async saveContract(
    appRequestId: string,
    screenName: string,
    layoutType: LayoutType,
    framework: Framework,
    contractData: VisualCodeRenderingContractData,
    generatedCode: string,
    contractHash: string,
    codeHash: string,
    context: IsolatedContext
  ): Promise<string> {
    const contractId = `vcrc-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    await this.prisma.visualCodeRenderingContract.create({
      data: {
        id: contractId,
        appRequestId,
        screenName,
        layoutType,
        framework,
        generatedCode,
        codeHash,
        viewportWidth: contractData.viewport.width,
        viewportHeight: contractData.viewport.height,
        contractJson: JSON.stringify(contractData),
        contractHash,
        basePromptHash: context.basePrompt.hash,
        planningDocsHash: context.planningDocs.hash,
        screenIndexHash: context.screenIndex.hash,
        screenDefinitionHash: context.screenDefinition.hash,
        visualExpansionContractHash: context.visualExpansionContract.contractHash,
        visualNormalizationContractHash: context.visualNormalizationContract.contractHash,
        visualCompositionContractHash: context.visualCompositionContract.contractHash,
        status: 'awaiting_approval',
      },
    });

    return contractId;
  }
}
