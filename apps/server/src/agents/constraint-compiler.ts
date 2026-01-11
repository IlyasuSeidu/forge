/**
 * Constraint Compiler (Rules Architect) - Tier 3 Constitutional Agent
 *
 * THE MOST CRITICAL AGENT IN FORGE
 *
 * Responsibilities:
 * - Generate project-specific, non-negotiable ruleset
 * - Lock down implementation constraints
 * - Create the "constitution" that binds all downstream coding agents
 * - Prevent invention, drift, and creative interpretation
 * - Transition Conductor from designs_ready → rules_locked
 *
 * HARD CONSTRAINTS:
 * - Cannot start unless Conductor = designs_ready
 * - Rules can only be generated ONCE
 * - Once approved, rules are IMMUTABLE (no regeneration allowed)
 * - Cannot invent features, screens, or modify planning
 * - Must generate explicit, enforceable, unambiguous rules
 * - Human approval is mandatory before rules become active
 * - Lock/unlock discipline required
 * - Full event emission for observability
 *
 * Architecture:
 * - Tier 3 Phase 2 agent (Design & Constraints)
 * - Consumes ALL Tier 1-3 outputs (strategy, screens, flows, mockups)
 * - Produces Markdown rules document (NOT code or UI)
 * - Rules become the single source of truth for all implementation
 * - Once locked, rules cannot be changed
 *
 * The Rules Document:
 * - Must contain 11 mandatory sections
 * - Governs architecture, structure, conduct, testing, deployment
 * - Explicit stop conditions for AI agents
 * - Binding contract for all future code generation
 */

import type { PrismaClient, ProjectRuleSet } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';

/**
 * RuleSet Status Constants
 */
const RuleSetStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

type RuleSetStatusValue = (typeof RuleSetStatus)[keyof typeof RuleSetStatus];

/**
 * Project RuleSet Data Transfer Object
 */
export interface ProjectRuleSetData {
  id: string;
  appRequestId: string;
  content: string;
  status: RuleSetStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * LLM Configuration
 */
interface LLMConfig {
  apiKey: string;
  model: string; // "gpt-4o" or "gpt-5"
}

/**
 * Constraint Compiler Agent
 *
 * Tier 3 Phase 2 agent responsible for generating the immutable project ruleset
 * that governs all downstream code generation.
 */
export class ConstraintCompiler {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private llmConfig: LLMConfig;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;

    // LLM configuration (GPT-5 recommended for rule generation)
    this.llmConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.LLM_MODEL || 'gpt-4o',
    };

    this.logger.info('ConstraintCompiler initialized with LLM config');
  }

  /**
   * Start Constraint Compiler - Generate Project Rules
   *
   * Rules:
   * - Conductor must be in designs_ready state
   * - Rules can only be generated ONCE per appRequest
   * - If rules already exist (approved), throw error
   * - Locks Conductor during generation
   * - Generates comprehensive ruleset via LLM
   * - Saves as awaiting_approval
   * - Pauses for human review
   *
   * @throws Error if Conductor not in designs_ready state
   * @throws Error if rules already approved
   */
  async start(appRequestId: string): Promise<ProjectRuleSetData> {
    this.logger.info({ appRequestId }, 'Starting Constraint Compiler');

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'designs_ready') {
      throw new Error(
        `Cannot start Constraint Compiler: Conductor state is '${state.currentStatus}', expected 'designs_ready'`
      );
    }

    this.logger.debug({ appRequestId, state: 'designs_ready' }, 'Conductor state validated');

    // Check if rules already exist
    const existingRules = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId },
    });

    if (existingRules && existingRules.status === RuleSetStatus.APPROVED) {
      throw new Error(
        'Project rules are already approved and immutable. No regeneration allowed.'
      );
    }

    if (existingRules && existingRules.status === RuleSetStatus.AWAITING_APPROVAL) {
      throw new Error(
        'Project rules are already awaiting approval. Reject first before regenerating.'
      );
    }

    // Lock Conductor
    await this.conductor.lock(appRequestId);

    try {
      // Load complete context
      const context = await this.loadComprehensiveContext(appRequestId);

      // Generate rules document
      const rulesContent = await this.generateRulesDocument(appRequestId, context);

      // Save rules to database
      const ruleSet = await this.prisma.projectRuleSet.create({
        data: {
          id: randomUUID(),
          appRequestId,
          content: rulesContent,
          status: RuleSetStatus.AWAITING_APPROVAL,
        },
      });

      this.logger.info({ appRequestId, ruleSetId: ruleSet.id }, 'Project rules saved to database');

      // Emit rules_generated event
      await this.emitEvent(appRequestId, 'rules_generated', 'Project ruleset generated - awaiting approval');

      // Pause Conductor for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        'Project rules generated - awaiting human approval'
      );

      this.logger.info({ appRequestId }, 'Conductor paused for rules approval');

      // Unlock Conductor
      await this.conductor.unlock(appRequestId);

      return this.toRuleSetData(ruleSet);
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      throw error;
    }
  }

  /**
   * Approve Project Rules
   *
   * Rules:
   * - Marks rules as approved (IMMUTABLE)
   * - Emits rules_approved event
   * - Transitions Conductor to rules_locked
   * - Once approved, rules CANNOT be regenerated
   *
   * @throws Error if no rules awaiting approval
   * @throws Error if rules already approved
   */
  async approveRules(appRequestId: string): Promise<ProjectRuleSetData> {
    this.logger.info({ appRequestId }, 'Approving project rules');

    // Get current rules
    const ruleSet = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId },
    });

    if (!ruleSet) {
      throw new Error(`No project rules found for appRequestId: ${appRequestId}`);
    }

    if (ruleSet.status === RuleSetStatus.APPROVED) {
      throw new Error('Project rules are already approved and immutable');
    }

    if (ruleSet.status !== RuleSetStatus.AWAITING_APPROVAL) {
      throw new Error(`Cannot approve rules with status: ${ruleSet.status}`);
    }

    // Mark as approved (NOW IMMUTABLE)
    const approved = await this.prisma.projectRuleSet.update({
      where: { id: ruleSet.id },
      data: {
        status: RuleSetStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info({ appRequestId, ruleSetId: approved.id }, 'Project rules approved - NOW IMMUTABLE');

    // Emit rules_approved event
    await this.emitEvent(
      appRequestId,
      'rules_approved',
      'Project rules approved by human - rules are now immutable'
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Transition Conductor to rules_locked
    await this.conductor.transition(appRequestId, 'rules_locked', 'ConstraintCompiler');

    this.logger.info({ appRequestId, newStatus: 'rules_locked' }, 'Conductor transitioned to rules_locked');

    // Emit rules_locked event
    await this.emitEvent(
      appRequestId,
      'rules_locked',
      'Project rules locked - all downstream agents must obey these rules'
    );

    return this.toRuleSetData(approved);
  }

  /**
   * Reject Project Rules
   *
   * Rules:
   * - Deletes draft rules
   * - Emits rules_rejected event
   * - Unlocks Conductor (allows regeneration)
   * - Does NOT advance Conductor
   *
   * @param feedback Optional feedback for regeneration
   */
  async rejectRules(appRequestId: string, feedback?: string): Promise<void> {
    this.logger.info({ appRequestId, feedback }, 'Rejecting project rules');

    // Get current rules
    const ruleSet = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId },
    });

    if (!ruleSet) {
      throw new Error(`No project rules found for appRequestId: ${appRequestId}`);
    }

    if (ruleSet.status === RuleSetStatus.APPROVED) {
      throw new Error('Cannot reject approved rules - rules are immutable');
    }

    if (ruleSet.status !== RuleSetStatus.AWAITING_APPROVAL) {
      throw new Error(`Cannot reject rules with status: ${ruleSet.status}`);
    }

    // Delete rules from database
    await this.prisma.projectRuleSet.delete({
      where: { id: ruleSet.id },
    });

    this.logger.info({ appRequestId, ruleSetId: ruleSet.id }, 'Project rules deleted');

    // Emit rules_rejected event
    await this.emitEvent(
      appRequestId,
      'rules_rejected',
      `Project rules rejected by human${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor (ready for regeneration)
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Conductor unlocked - ready for rules regeneration');
  }

  /**
   * Get current project rules
   *
   * Returns rules data if exists, null otherwise
   */
  async getCurrentRules(appRequestId: string): Promise<ProjectRuleSetData | null> {
    const ruleSet = await this.prisma.projectRuleSet.findUnique({
      where: { appRequestId },
    });

    return ruleSet ? this.toRuleSetData(ruleSet) : null;
  }

  /**
   * Generate comprehensive rules document via LLM
   *
   * Generates Markdown document with 11 mandatory sections:
   * 1. Project Authority & Scope
   * 2. AI Conduct Rules
   * 3. Architecture & Stack Lock
   * 4. Folder & File Structure
   * 5. UI & Design Fidelity Rules
   * 6. Role & Permission Enforcement
   * 7. Data & Logic Discipline
   * 8. Git & Documentation Discipline
   * 9. Testing & Verification Alignment
   * 10. Deployment & Environment Safety
   * 11. Stop Conditions
   *
   * @private
   */
  private async generateRulesDocument(
    appRequestId: string,
    context: {
      basePrompt: string;
      masterPlan: string;
      implementationPlan: string;
      screenCount: number;
      screenNames: string[];
      roleCount: number;
      roleNames: string[];
      mockupCount: number;
    }
  ): Promise<string> {
    this.logger.debug({ appRequestId, contextLoaded: true }, 'Generating rules document via LLM');

    // Check if LLM is configured
    if (!this.llmConfig.apiKey) {
      this.logger.warn('LLM API key not configured - using fallback mode');
      return this.generateFallbackRulesDocument(context);
    }

    // Build comprehensive prompt for LLM
    const systemPrompt = `You are the Constraint Compiler for Forge, an AI-powered app builder.

Your role is to generate a comprehensive, explicit, enforceable project ruleset that will govern ALL downstream code generation agents.

This ruleset is a CONSTITUTION - once approved by the human, it becomes IMMUTABLE and binding.

You must generate a Markdown document with exactly 11 sections as specified. Each section must be thorough, explicit, and leave NO room for interpretation or creativity by downstream agents.

CRITICAL: You are NOT generating code or UI. You are generating RULES that will prevent bad code and bad decisions.`;

    const userPrompt = `Generate the project ruleset for this application:

**Base Prompt:**
${context.basePrompt}

**Master Plan:**
${context.masterPlan}

**Implementation Plan:**
${context.implementationPlan}

**Approved Screens:** ${context.screenCount} screens (${context.screenNames.join(', ')})
**User Roles:** ${context.roleCount} roles (${context.roleNames.join(', ')})
**UI Mockups:** ${context.mockupCount} approved mockups

Generate a comprehensive Markdown document called "Project Rules" with these 11 sections:

1. **Project Authority & Scope**
2. **AI Conduct Rules**
3. **Architecture & Stack Lock**
4. **Folder & File Structure**
5. **UI & Design Fidelity Rules**
6. **Role & Permission Enforcement**
7. **Data & Logic Discipline**
8. **Git & Documentation Discipline**
9. **Testing & Verification Alignment**
10. **Deployment & Environment Safety**
11. **Stop Conditions**

Make the rules explicit, specific, and enforceable. Downstream coding agents will be required to follow these rules exactly.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: this.llmConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Low temperature for consistent, disciplined output
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rulesContent = data.choices[0].message.content;

      this.logger.info(
        { appRequestId, contentLength: rulesContent.length },
        'Rules document generated by LLM'
      );

      return rulesContent;
    } catch (error) {
      this.logger.error({ error, appRequestId }, 'Failed to generate rules via LLM');
      throw new Error(`Failed to generate rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate fallback rules document (for testing without LLM)
   *
   * @private
   */
  private generateFallbackRulesDocument(context: {
    basePrompt: string;
    masterPlan: string;
    implementationPlan: string;
    screenCount: number;
    screenNames: string[];
    roleCount: number;
    roleNames: string[];
    mockupCount: number;
  }): string {
    return `# Project Rules

This document is the **single source of truth** for implementation. All coding agents must follow these rules exactly.

## 1. Project Authority & Scope

- This document governs all implementation decisions
- Nothing outside approved planning documents is allowed
- If ambiguity exists, the AI agent must STOP and ask for clarification
- Approved screens: ${context.screenNames.join(', ')}
- User roles: ${context.roleNames.join(', ')}

## 2. AI Conduct Rules

- **No invention**: Do not create features, screens, or functionality not explicitly defined
- **No assumptions**: If unclear, ask or halt
- **No silent fixes**: All changes must be traceable and justified
- **Ask or halt on ambiguity**: Never guess the user's intent

## 3. Architecture & Stack Lock

- Frontend: Next.js (latest stable version with App Router)
- Backend: Next.js API routes / Server Actions
- Database: PostgreSQL with Prisma ORM
- State Management: React Context / Zustand (as needed)
- Deployment: Vercel-compatible

## 4. Folder & File Structure

- \`/app\`: Next.js app directory (routes, layouts, pages)
- \`/components\`: Reusable UI components
- \`/lib\`: Utility functions, database, API clients
- \`/types\`: TypeScript type definitions
- Naming: kebab-case for files, PascalCase for components

## 5. UI & Design Fidelity Rules

- UI mockups are authoritative
- No layout drift from approved designs
- Responsive behavior: Mobile-first approach
- Accessibility: WCAG 2.1 AA compliance required

## 6. Role & Permission Enforcement

- User roles: ${context.roleNames.join(', ')}
- Role-based access control must be enforced at API level
- Never show features to unauthorized roles
- Implement privilege checks in middleware

## 7. Data & Logic Discipline

- Business logic lives in service layer (\`/lib/services\`)
- Validation happens both client-side and server-side
- Side effects handled explicitly with proper error boundaries
- All errors logged and handled gracefully

## 8. Git & Documentation Discipline

- Commit frequently with descriptive messages
- Follow conventional commits format
- Update project_log.md with major changes
- No silent local changes without commits

## 9. Testing & Verification Alignment

- All features must pass Phase 10 verification
- Manual testing required for user-facing features
- Edge cases must be tested
- "Done" means: built, tested, and verified

## 10. Deployment & Environment Safety

- No hardcoded secrets in code
- Use environment variables for all configuration
- Separate development and production behavior
- Database migrations tested before production

## 11. Stop Conditions

The AI agent must STOP and ask for help if:
- A requirement conflicts with another
- A rule is unclear or ambiguous
- A feature request exceeds approved scope
- A task would take excessive time/complexity
- Security implications are uncertain

**These rules are now IMMUTABLE and binding.**`;
  }

  /**
   * Load comprehensive context for rule generation
   *
   * Loads all Tier 1-3 outputs
   *
   * @private
   */
  private async loadComprehensiveContext(
    appRequestId: string
  ): Promise<{
    basePrompt: string;
    masterPlan: string;
    implementationPlan: string;
    screenCount: number;
    screenNames: string[];
    roleCount: number;
    roleNames: string[];
    mockupCount: number;
  }> {
    // Load base prompt
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest) {
      throw new Error(`AppRequest not found: ${appRequestId}`);
    }

    const basePromptArtifact = await this.prisma.artifact.findFirst({
      where: {
        projectId: appRequest.projectId,
        type: 'base_prompt',
      },
    });

    const basePrompt = basePromptArtifact?.path || 'No base prompt found';

    // Load planning documents
    const planningDocs = await this.prisma.planningDocument.findMany({
      where: {
        appRequestId,
        status: 'approved',
      },
    });

    const masterPlan =
      planningDocs.find(doc => doc.type === 'MASTER_PLAN')?.content || 'No master plan found';
    const implementationPlan =
      planningDocs.find(doc => doc.type === 'IMPLEMENTATION_PLAN')?.content ||
      'No implementation plan found';

    // Load screen index
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    const screenNames: string[] = screenIndex ? JSON.parse(screenIndex.screens) : [];
    const screenCount = screenNames.length;

    // Load user roles
    const rolesDef = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    const roleNames = rolesDef ? this.extractRoleNamesFromTable(rolesDef.content) : [];
    const roleCount = roleNames.length;

    // Count mockups
    const mockupCount = await this.prisma.screenMockup.count({
      where: {
        appRequestId,
        status: 'approved',
      },
    });

    this.logger.info(
      {
        appRequestId,
        screenCount,
        roleCount,
        mockupCount,
      },
      'Comprehensive context loaded'
    );

    return {
      basePrompt,
      masterPlan,
      implementationPlan,
      screenCount,
      screenNames,
      roleCount,
      roleNames,
      mockupCount,
    };
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
      const line = lines[i].trim();

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
   * Convert Prisma ProjectRuleSet to ProjectRuleSetData
   *
   * @private
   */
  private toRuleSetData(ruleSet: ProjectRuleSet): ProjectRuleSetData {
    return {
      id: ruleSet.id,
      appRequestId: ruleSet.appRequestId,
      content: ruleSet.content,
      status: ruleSet.status as RuleSetStatusValue,
      createdAt: ruleSet.createdAt,
      approvedAt: ruleSet.approvedAt,
    };
  }
}
