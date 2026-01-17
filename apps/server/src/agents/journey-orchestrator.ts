/**
 * Journey Orchestrator Agent
 *
 * Tier 2 - Product & Strategy Agent (AI-powered)
 *
 * Purpose:
 * Defines user roles and how each role moves through the application:
 * - Who the users are (roles)
 * - What each role can and cannot do (permissions)
 * - How each role moves through the app from entry → success (journeys)
 *
 * This agent defines HOW USERS MOVE, not UI, not code.
 *
 * Two-Phase Process:
 * 1. User Roles Table - Complete list of roles with permissions (global, approved once)
 * 2. User Journeys - Step-by-step journey for each role (one-by-one, approved individually)
 *
 * Critical Rules:
 * - ❌ Must NOT generate screens
 * - ❌ Must NOT generate UI
 * - ❌ Must NOT generate code
 * - ❌ Must NOT generate components
 * - ❌ Must NOT invent features
 * - ❌ Must NOT advance Conductor without approval
 * - ❌ Must NOT run unless state = screens_defined
 * - ✅ Uses LLM (GPT-5)
 * - ✅ Everything stored durably in DB
 * - ✅ Human approval mandatory
 * - ✅ Roles and flows must align strictly with Screen Cartographer outputs
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';

/**
 * Flow Status Constants
 */
export const FlowStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

export type FlowStatusValue = typeof FlowStatus[keyof typeof FlowStatus];

/**
 * User Roles Definition Interface
 */
export interface UserRolesData {
  id: string;
  appRequestId: string;
  content: string; // Markdown table
  status: FlowStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * User Journey Interface
 */
export interface UserJourneyData {
  id: string;
  appRequestId: string;
  roleName: string;
  content: string; // Markdown journey steps
  order: number;
  status: FlowStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

/**
 * Current State Interface
 */
export interface OrchestratorState {
  rolesStatus: FlowStatusValue | null;
  roleNames: string[];
  totalRoles: number;
  currentJourney: UserJourneyData | null;
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
 * Context for LLM generation
 */
interface FlowContext {
  basePrompt: string;
  masterPlan: string;
  implPlan: string;
  screenNames: string[];
  screenDescriptions: Map<string, string>;
}

/**
 * Journey Orchestrator Agent
 *
 * Fourth AI-backed agent in Forge.
 * Defines user roles and user journeys through the application.
 */
export class JourneyOrchestrator {
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
      maxTokens: config?.maxTokens || 2500,
    };

    this.logger.info('JourneyOrchestrator initialized with LLM config');
  }

  /**
   * Start journey orchestration process (Phase 1: User Roles Table)
   *
   * Rules:
   * - Validates Conductor state = screens_defined
   * - Locks Conductor
   * - Generates User Roles Table via LLM
   * - Saves with status = awaiting_approval
   * - Pauses Conductor for human approval
   * - Emits event: user_roles_created
   *
   * @throws Error if Conductor not in screens_defined state
   * @throws Error if screens not defined
   * @throws Error if roles already exist
   */
  async start(appRequestId: string): Promise<UserRolesData> {
    this.logger.info({ appRequestId }, 'Starting Journey Orchestrator');

    // Validate Conductor state
    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'screens_defined') {
      throw new Error(
        `Cannot start Journey Orchestrator: Conductor state is '${state.currentStatus}', expected 'screens_defined'`
      );
    }

    this.logger.debug({ appRequestId, state: state.currentStatus }, 'Conductor state validated');

    // Check if roles already exist
    const existing = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    if (existing) {
      throw new Error(`User Roles already exist for appRequestId: ${appRequestId}`);
    }

    // Get flow context (planning + screens)
    const context = await this.getFlowContext(appRequestId);

    this.logger.info(
      {
        appRequestId,
        screenCount: context.screenNames.length,
        basePromptLength: context.basePrompt.length,
      },
      'Flow context loaded'
    );

    // Lock Conductor
    await this.conductor.lock(appRequestId);
    this.logger.debug({ appRequestId }, 'Conductor locked');

    // Generate User Roles Table
    const rolesTable = await this.generateUserRoles(context);

    this.logger.info(
      { appRequestId, contentLength: rolesTable.length },
      'User Roles Table generated by LLM'
    );

    // Save User Roles Definition
    const rolesDef = await this.prisma.userRoleDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId,
        content: rolesTable,
        status: FlowStatus.AWAITING_APPROVAL,
      },
    });

    this.logger.info(
      { appRequestId, rolesDefId: rolesDef.id },
      'User Roles Table saved to database'
    );

    // Emit user_roles_created event
    await this.emitEvent(
      appRequestId,
      'user_roles_created',
      'User Roles Table created - awaiting approval'
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(
      appRequestId,
      'User Roles Table generated - awaiting human approval'
    );

    this.logger.info({ appRequestId }, 'Conductor paused for human approval');

    // Unlock Conductor (paused but not locked)
    await this.conductor.unlock(appRequestId);

    return this.toUserRolesData(rolesDef);
  }

  /**
   * Approve User Roles Table
   *
   * Rules:
   * - Marks roles as approved
   * - Emits event: user_roles_approved
   * - Unlocks Conductor
   *
   * @throws Error if roles not found
   * @throws Error if roles not in awaiting_approval status
   */
  async approveUserRoles(appRequestId: string): Promise<UserRolesData> {
    this.logger.info({ appRequestId }, 'Approving User Roles Table');

    // Get user roles
    const rolesDef = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    if (!rolesDef) {
      throw new Error(`User Roles not found for appRequestId: ${appRequestId}`);
    }

    if (rolesDef.status !== FlowStatus.AWAITING_APPROVAL) {
      throw new Error(
        `Cannot approve: User Roles are in '${rolesDef.status}' status, expected 'awaiting_approval'`
      );
    }

    // Mark as approved
    const approved = await this.prisma.userRoleDefinition.update({
      where: { id: rolesDef.id },
      data: {
        status: FlowStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info({ appRequestId, rolesDefId: approved.id }, 'User Roles Table approved');

    // Emit user_roles_approved event
    await this.emitEvent(
      appRequestId,
      'user_roles_approved',
      'User Roles Table approved by human - ready for journey generation'
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info({ appRequestId }, 'Ready for first user journey');

    return this.toUserRolesData(approved);
  }

  /**
   * Generate next user journey (Phase 2: Sequential Journey Generation)
   *
   * Rules:
   * - Finds next role by order
   * - Generates detailed journey steps
   * - Saves as awaiting_approval
   * - Locks & pauses Conductor
   * - Emits user_journey_created
   *
   * Important:
   * - Only one journey may be generated at a time
   * - Must pause for approval after each journey
   *
   * @throws Error if roles not approved
   * @throws Error if no more roles to generate
   */
  async generateNextJourney(appRequestId: string): Promise<UserJourneyData> {
    this.logger.info({ appRequestId }, 'Generating next user journey');

    // Verify roles are approved
    const rolesDef = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    if (!rolesDef) {
      throw new Error(`User Roles not found for appRequestId: ${appRequestId}`);
    }

    if (rolesDef.status !== FlowStatus.APPROVED) {
      throw new Error(
        `Cannot generate journeys: User Roles status is '${rolesDef.status}', expected 'approved'`
      );
    }

    // Extract role names from roles table
    const roleNames = this.extractRoleNamesFromTable(rolesDef.content);

    // Get existing journeys
    const existingJourneys = await this.prisma.userJourney.findMany({
      where: { appRequestId },
      orderBy: { order: 'asc' },
    });

    // Find next role to generate
    const nextOrder = existingJourneys.length;
    if (nextOrder >= roleNames.length) {
      throw new Error('All user journeys have been generated');
    }

    const roleName = roleNames[nextOrder];

    this.logger.debug(
      { appRequestId, roleName, order: nextOrder, total: roleNames.length },
      'Next role identified'
    );

    // Get flow context
    const context = await this.getFlowContext(appRequestId);

    // Lock Conductor
    await this.conductor.lock(appRequestId);

    // Generate user journey
    const journeyContent = await this.generateUserJourney(
      roleName!,
      roleNames,
      rolesDef.content,
      context
    );

    this.logger.info(
      { appRequestId, roleName, contentLength: journeyContent.length },
      'User journey generated by LLM'
    );

    // Save user journey
    const journey = await this.prisma.userJourney.create({
      data: {
        id: randomUUID(),
        appRequestId,
        roleName: roleName!,
        content: journeyContent,
        order: nextOrder,
        status: FlowStatus.AWAITING_APPROVAL,
      },
    });

    this.logger.info(
      { appRequestId, journeyId: journey.id, roleName, order: nextOrder },
      'User journey saved to database'
    );

    // Emit user_journey_created event
    await this.emitEvent(
      appRequestId,
      'user_journey_created',
      `User journey for "${roleName}" created - awaiting approval (${nextOrder + 1}/${roleNames.length})`
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(
      appRequestId,
      `User journey for "${roleName}" generated - awaiting human approval`
    );

    this.logger.info({ appRequestId, roleName }, 'Conductor paused for journey approval');

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    return this.toUserJourneyData(journey);
  }

  /**
   * Approve current user journey
   *
   * Rules:
   * - Marks current journey as approved
   * - Emits user_journey_approved
   * - Unlocks Conductor
   * - If more roles remain → ready for next
   * - If all journeys approved → transition Conductor to flows_defined
   *
   * @throws Error if no journey awaiting approval
   */
  async approveCurrentJourney(appRequestId: string): Promise<UserJourneyData> {
    this.logger.info({ appRequestId }, 'Approving current user journey');

    // Get current journey (most recent awaiting approval)
    const currentJourney = await this.prisma.userJourney.findFirst({
      where: {
        appRequestId,
        status: FlowStatus.AWAITING_APPROVAL,
      },
      orderBy: {
        order: 'desc',
      },
    });

    if (!currentJourney) {
      throw new Error(`No user journey awaiting approval for appRequestId: ${appRequestId}`);
    }

    // Mark as approved
    const approved = await this.prisma.userJourney.update({
      where: { id: currentJourney.id },
      data: {
        status: FlowStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    this.logger.info(
      { appRequestId, journeyId: approved.id, roleName: approved.roleName },
      'User journey approved'
    );

    // Emit user_journey_approved event
    await this.emitEvent(
      appRequestId,
      'user_journey_approved',
      `User journey for "${approved.roleName}" approved by human`
    );

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    // Check if all journeys are approved
    const rolesDef = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    if (!rolesDef) {
      throw new Error(`User Roles not found for appRequestId: ${appRequestId}`);
    }

    const roleNames = this.extractRoleNamesFromTable(rolesDef.content);
    const totalRoles = roleNames.length;

    const approvedJourneys = await this.prisma.userJourney.count({
      where: {
        appRequestId,
        status: FlowStatus.APPROVED,
      },
    });

    this.logger.debug(
      { appRequestId, approvedJourneys, totalRoles },
      'User journey approval progress'
    );

    if (approvedJourneys === totalRoles) {
      this.logger.info({ appRequestId }, 'All user journeys approved - completing flows phase');

      // Transition Conductor to flows_defined
      await this.conductor.transition(appRequestId, 'flows_defined', 'JourneyOrchestrator');

      this.logger.info(
        { appRequestId, newStatus: 'flows_defined' },
        'Conductor transitioned to flows_defined'
      );

      // Emit flows_defined event
      await this.emitEvent(
        appRequestId,
        'flows_defined',
        `All ${totalRoles} user journeys defined and approved - ready for visual design`
      );
    } else {
      this.logger.info(
        { appRequestId, remainingJourneys: totalRoles - approvedJourneys },
        'Ready for next user journey'
      );
    }

    return this.toUserJourneyData(approved);
  }

  /**
   * Reject current user journey
   *
   * Rules:
   * - Deletes current draft
   * - Emits user_journey_rejected
   * - Unlocks Conductor
   * - Allows regeneration
   *
   * @throws Error if no journey awaiting approval
   */
  async rejectCurrentJourney(appRequestId: string, feedback?: string): Promise<void> {
    this.logger.info({ appRequestId, feedback }, 'Rejecting current user journey');

    // Get current journey
    const currentJourney = await this.prisma.userJourney.findFirst({
      where: {
        appRequestId,
        status: FlowStatus.AWAITING_APPROVAL,
      },
      orderBy: {
        order: 'desc',
      },
    });

    if (!currentJourney) {
      throw new Error(`No user journey awaiting approval for appRequestId: ${appRequestId}`);
    }

    // Delete journey
    await this.prisma.userJourney.delete({
      where: { id: currentJourney.id },
    });

    this.logger.info(
      { appRequestId, journeyId: currentJourney.id, roleName: currentJourney.roleName },
      'User journey deleted'
    );

    // Emit user_journey_rejected event
    await this.emitEvent(
      appRequestId,
      'user_journey_rejected',
      `User journey for "${currentJourney.roleName}" rejected by human${feedback ? `: ${feedback}` : ''}`
    );

    // Unlock Conductor
    await this.conductor.unlock(appRequestId);

    this.logger.info({ appRequestId }, 'Conductor unlocked - ready for regeneration');
  }

  /**
   * Get current orchestrator state
   *
   * Returns comprehensive state information including:
   * - User Roles status
   * - Current journey (if any)
   * - Progress (completed/remaining)
   */
  async getCurrentState(appRequestId: string): Promise<OrchestratorState> {
    // Get user roles
    const rolesDef = await this.prisma.userRoleDefinition.findUnique({
      where: { appRequestId },
    });

    if (!rolesDef) {
      return {
        rolesStatus: null,
        roleNames: [],
        totalRoles: 0,
        currentJourney: null,
        completedCount: 0,
        remainingCount: 0,
      };
    }

    const roleNames = this.extractRoleNamesFromTable(rolesDef.content);
    const totalRoles = roleNames.length;

    // Get current journey (awaiting approval)
    const currentJourney = await this.prisma.userJourney.findFirst({
      where: {
        appRequestId,
        status: FlowStatus.AWAITING_APPROVAL,
      },
      orderBy: {
        order: 'desc',
      },
    });

    // Get approved count
    const completedCount = await this.prisma.userJourney.count({
      where: {
        appRequestId,
        status: FlowStatus.APPROVED,
      },
    });

    return {
      rolesStatus: rolesDef.status as FlowStatusValue,
      roleNames,
      totalRoles,
      currentJourney: currentJourney ? this.toUserJourneyData(currentJourney) : null,
      completedCount,
      remainingCount: totalRoles - completedCount - (currentJourney ? 1 : 0),
    };
  }

  /**
   * Generate User Roles Table via LLM
   *
   * Input: Context (planning + screens)
   * Output: Markdown table
   *
   * Required columns:
   * - Role name
   * - Description
   * - Permissions
   * - Screens accessible
   * - Features accessible
   * - Visibility rules
   *
   * Must NOT:
   * - Generate code
   * - Generate UI
   * - Invent features
   *
   * @private
   */
  private async generateUserRoles(context: FlowContext): Promise<string> {
    const systemPrompt = `You are a senior product flow architect generating a User Roles Table.

Your job is to define ALL user roles that will use this application.

Required columns in table:
1. Role Name
2. Description
3. Permissions (what they can/cannot do)
4. Screens Accessible (from approved screen list)
5. Features Accessible
6. Visibility Rules

Rules:
- NO code generation
- NO UI design
- DO NOT invent features not implied by planning
- Only reference screens that exist in the approved screen list
- Be exhaustive - include all roles implied by the planning docs
- Common roles: Guest, Registered User, Admin, etc.

Output format: Markdown table with all columns.

Available screens:
${context.screenNames.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Be precise and comprehensive.`;

    const userPrompt = `Base Prompt:

${context.basePrompt}

---

Master Plan:

${context.masterPlan}

---

Implementation Plan:

${context.implPlan}

---

Generate a complete User Roles Table.`;

    this.logger.debug(
      {
        screenCount: context.screenNames.length,
        basePromptLength: context.basePrompt.length,
      },
      'Generating User Roles Table via LLM'
    );

    return await this.callLLM(systemPrompt, userPrompt);
  }

  /**
   * Generate User Journey via LLM
   *
   * Input: Role name + Context
   * Output: Step-by-step journey (Markdown)
   *
   * Format:
   * Step 1: Visit Landing Page
   * Step 2: Click Sign Up
   * Step 3: Complete form
   * ...
   *
   * Rules:
   * - Must reference only approved screens
   * - Must include edge cases (logout, session expiry if implied)
   * - Step-by-step format
   *
   * Must NOT:
   * - Generate code
   * - Generate UI
   * - Invent screens
   *
   * @private
   */
  private async generateUserJourney(
    roleName: string,
    allRoles: string[],
    rolesTable: string,
    context: FlowContext
  ): Promise<string> {
    const systemPrompt = `You are a senior product flow architect generating a User Journey.

Your job is to describe the step-by-step journey for ONE specific user role.

Format:
Step 1: Visit [Screen Name]
Step 2: Perform [action]
Step 3: Navigate to [Screen Name]
...

Rules:
- NO code generation
- NO UI design
- Only reference screens from the approved screen list
- Include edge cases (logout, session expiry, errors) if implied
- Be specific but stay high-level
- Focus on HOW the user moves through the app

Available screens:
${context.screenNames.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Output format: Numbered steps in Markdown.`;

    const userPrompt = `User Roles Table:

${rolesTable}

---

Available Roles:
${allRoles.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---

Generate a detailed user journey for: **${roleName}**

Include:
- Entry point (how they arrive at the app)
- Main flow (key actions and screen transitions)
- Success state (what "done" looks like)
- Edge cases (logout, errors, etc.) if relevant`;

    this.logger.debug(
      {
        roleName,
        allRolesCount: allRoles.length,
        screenCount: context.screenNames.length,
      },
      'Generating user journey via LLM'
    );

    return await this.callLLM(systemPrompt, userPrompt);
  }

  /**
   * Extract role names from roles table
   *
   * Parses the markdown table to extract role names from the first column.
   *
   * @private
   */
  private extractRoleNamesFromTable(rolesTable: string): string[] {
    // Parse markdown table to extract role names
    const lines = rolesTable.split('\n').filter(line => line.trim());

    const roleNames: string[] = [];

    for (const line of lines) {
      // Skip header and separator lines
      if (line.includes('---') || line.includes('Role Name')) {
        continue;
      }

      // Extract first column (role name)
      const match = line.match(/\|\s*([^|]+)\s*\|/);
      if (match) {
        const roleName = match[1]!.trim();
        if (roleName && roleName !== 'Role Name') {
          roleNames.push(roleName);
        }
      }
    }

    return roleNames;
  }

  /**
   * Get flow context (Planning + Screens)
   *
   * @private
   */
  private async getFlowContext(appRequestId: string): Promise<FlowContext> {
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

    // Get screens
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId, status: 'approved' },
    });

    if (!screenIndex) {
      throw new Error('Screen Index not found or not approved');
    }

    const screenNames: string[] = JSON.parse(screenIndex.screens);

    const screenDefinitions = await this.prisma.screenDefinition.findMany({
      where: {
        appRequestId,
        status: 'approved',
      },
      orderBy: { order: 'asc' },
    });

    const screenDescriptions = new Map<string, string>();
    for (const screen of screenDefinitions) {
      screenDescriptions.set(screen.screenName, screen.content);
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

    const basePrompt = `Base Prompt (path: ${artifact.path})`;

    return {
      basePrompt,
      masterPlan: masterPlan.content,
      implPlan: implPlan.content,
      screenNames,
      screenDescriptions,
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
    const isRolesTable = prompt.includes('User Roles Table');

    if (isRolesTable) {
      return `| Role Name | Description | Permissions | Screens Accessible | Features Accessible | Visibility Rules |
|-----------|-------------|-------------|-------------------|---------------------|------------------|
| Guest | Unauthenticated visitor | View public content only | Landing Page, Sign Up, Login | Browse features, View demos | Public content only |
| Registered User | Authenticated user | Full access to core features | All screens except Admin | Create, edit, delete own content | Own data + shared data |
| Admin | System administrator | Full system access | All screens | Manage users, system settings | All data |`;
    } else {
      // Fallback user journey
      const roleNameMatch = prompt.match(/\*\*(.+?)\*\*/);
      const roleName = roleNameMatch ? roleNameMatch[1] : 'Unknown Role';

      return `# User Journey: ${roleName}

## Entry Point
Step 1: User arrives at the Landing Page

## Authentication
Step 2: User clicks Sign Up (or Login if returning)
Step 3: User completes authentication form
Step 4: User is redirected to Dashboard

## Core Workflow
Step 5: User explores main features on Dashboard
Step 6: User creates new content/task
Step 7: User views details
Step 8: User edits or updates content

## Success State
Step 9: User achieves their goal
Step 10: User logs out or continues using the app

## Edge Cases
- If session expires: User is redirected to Login
- If error occurs: User sees error message and can retry
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
  private toUserRolesData(roles: any): UserRolesData {
    return {
      id: roles.id,
      appRequestId: roles.appRequestId,
      content: roles.content,
      status: roles.status as FlowStatusValue,
      createdAt: roles.createdAt,
      approvedAt: roles.approvedAt,
    };
  }

  /**
   * Convert Prisma model to interface
   *
   * @private
   */
  private toUserJourneyData(journey: any): UserJourneyData {
    return {
      id: journey.id,
      appRequestId: journey.appRequestId,
      roleName: journey.roleName,
      content: journey.content,
      order: journey.order,
      status: journey.status as FlowStatusValue,
      createdAt: journey.createdAt,
      approvedAt: journey.approvedAt,
    };
  }
}
