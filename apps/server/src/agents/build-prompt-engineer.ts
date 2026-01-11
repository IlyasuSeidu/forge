/**
 * Build Prompt Engineer - Tier 4 Translation Layer Agent
 *
 * THE BRIDGE BETWEEN DESIGN AND EXECUTION
 *
 * Responsibilities:
 * - Convert approved intent + design + rules into code-ready build prompts
 * - Generate prompts for execution agents (does NOT write code itself)
 * - Ensure each prompt is atomic, scoped, and references project rules
 * - Maintain deterministic build order
 * - Transition Conductor from rules_locked → building
 *
 * HARD CONSTRAINTS:
 * - Cannot start unless Conductor = rules_locked
 * - Does NOT write production code
 * - Only generates Markdown instructions
 * - One prompt = one atomic build task
 * - All prompts must reference project rules explicitly
 * - Human approval required for each prompt
 * - Lock/unlock discipline required
 * - Full event emission for observability
 */

import type { PrismaClient, BuildPrompt } from '@prisma/client';
import type { ForgeConductor } from '../conductor/forge-conductor.js';
import type { Logger } from 'pino';
import { randomUUID } from 'crypto';

const PromptStatus = {
  DRAFT: 'draft',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
} as const;

type PromptStatusValue = (typeof PromptStatus)[keyof typeof PromptStatus];

export interface BuildPromptData {
  id: string;
  appRequestId: string;
  title: string;
  content: string;
  order: number;
  status: PromptStatusValue;
  createdAt: Date;
  approvedAt: Date | null;
}

export interface EngineerState {
  totalPrompts: number;
  currentPrompt: BuildPromptData | null;
  completedCount: number;
  remainingCount: number;
}

interface LLMConfig {
  apiKey: string;
  model: string;
}

/**
 * Build phase definitions (deterministic order)
 */
const BUILD_PHASES = [
  'scaffolding',
  'architecture',
  'auth',
  'ui_screens',
  'logic',
  'integrations',
  'polish',
] as const;

export class BuildPromptEngineer {
  private prisma: PrismaClient;
  private conductor: ForgeConductor;
  private logger: Logger;
  private llmConfig: LLMConfig;

  constructor(prisma: PrismaClient, conductor: ForgeConductor, logger: Logger) {
    this.prisma = prisma;
    this.conductor = conductor;
    this.logger = logger;

    this.llmConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.LLM_MODEL || 'gpt-4o',
    };

    this.logger.info('BuildPromptEngineer initialized');
  }

  async start(appRequestId: string): Promise<BuildPromptData> {
    this.logger.info({ appRequestId }, 'Starting Build Prompt Engineer');

    const state = await this.conductor.getStateSnapshot(appRequestId);
    if (state.currentStatus !== 'rules_locked') {
      throw new Error(
        `Cannot start Build Prompt Engineer: Conductor state is '${state.currentStatus}', expected 'rules_locked'`
      );
    }

    await this.conductor.lock(appRequestId);

    try {
      const context = await this.loadContext(appRequestId);
      const promptContent = await this.generatePromptForPhase(appRequestId, 'scaffolding', context, 0);

      const prompt = await this.prisma.buildPrompt.create({
        data: {
          id: randomUUID(),
          appRequestId,
          title: 'Project Scaffolding & Setup',
          content: promptContent,
          order: 0,
          status: PromptStatus.AWAITING_APPROVAL,
        },
      });

      await this.emitEvent(appRequestId, 'build_prompt_created', `Build prompt created: ${prompt.title}`);
      await this.conductor.pauseForHuman(appRequestId, `Build prompt generated - awaiting approval`);
      await this.conductor.unlock(appRequestId);

      return this.toPromptData(prompt);
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      throw error;
    }
  }

  async approveCurrentPrompt(appRequestId: string): Promise<BuildPromptData> {
    this.logger.info({ appRequestId }, 'Approving current build prompt');

    const prompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: PromptStatus.AWAITING_APPROVAL },
      orderBy: { order: 'desc' },
    });

    if (!prompt) {
      throw new Error(`No build prompt awaiting approval`);
    }

    const approved = await this.prisma.buildPrompt.update({
      where: { id: prompt.id },
      data: { status: PromptStatus.APPROVED, approvedAt: new Date() },
    });

    await this.emitEvent(appRequestId, 'build_prompt_approved', `Build prompt approved: ${approved.title}`);
    await this.conductor.resumeAfterHuman(appRequestId);

    // Check if all prompts complete
    const context = await this.loadContext(appRequestId);
    const nextOrder = approved.order + 1;
    const totalNeeded = this.calculateTotalPrompts(context);

    if (nextOrder >= totalNeeded) {
      await this.conductor.transition(appRequestId, 'build_prompts_ready', 'BuildPromptEngineer');
      await this.emitEvent(appRequestId, 'build_prompts_ready', 'All build prompts approved - ready for execution');
    }

    return this.toPromptData(approved);
  }

  async generateNextPrompt(appRequestId: string): Promise<BuildPromptData> {
    const approved = await this.prisma.buildPrompt.findMany({
      where: { appRequestId, status: PromptStatus.APPROVED },
      orderBy: { order: 'asc' },
    });

    const nextOrder = approved.length;
    const context = await this.loadContext(appRequestId);

    await this.conductor.lock(appRequestId);

    try {
      const phase = this.determinePhase(nextOrder, context);
      const promptContent = await this.generatePromptForPhase(appRequestId, phase, context, nextOrder);
      const title = this.getPhaseTitle(phase, nextOrder, context);

      const prompt = await this.prisma.buildPrompt.create({
        data: {
          id: randomUUID(),
          appRequestId,
          title,
          content: promptContent,
          order: nextOrder,
          status: PromptStatus.AWAITING_APPROVAL,
        },
      });

      await this.emitEvent(appRequestId, 'build_prompt_created', `Build prompt created: ${prompt.title}`);
      await this.conductor.pauseForHuman(appRequestId, `Build prompt generated - awaiting approval`);
      await this.conductor.unlock(appRequestId);

      return this.toPromptData(prompt);
    } catch (error) {
      await this.conductor.unlock(appRequestId);
      throw error;
    }
  }

  async rejectCurrentPrompt(appRequestId: string, feedback?: string): Promise<void> {
    const prompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: PromptStatus.AWAITING_APPROVAL },
      orderBy: { order: 'desc' },
    });

    if (!prompt) {
      throw new Error(`No build prompt awaiting approval`);
    }

    await this.prisma.buildPrompt.delete({ where: { id: prompt.id } });
    await this.emitEvent(
      appRequestId,
      'build_prompt_rejected',
      `Build prompt rejected: ${prompt.title}${feedback ? `: ${feedback}` : ''}`
    );
    await this.conductor.unlock(appRequestId);
  }

  async getCurrentState(appRequestId: string): Promise<EngineerState> {
    const context = await this.loadContext(appRequestId);
    const totalPrompts = this.calculateTotalPrompts(context);

    const currentPrompt = await this.prisma.buildPrompt.findFirst({
      where: { appRequestId, status: PromptStatus.AWAITING_APPROVAL },
    });

    const completedCount = await this.prisma.buildPrompt.count({
      where: { appRequestId, status: PromptStatus.APPROVED },
    });

    return {
      totalPrompts,
      currentPrompt: currentPrompt ? this.toPromptData(currentPrompt) : null,
      completedCount,
      remainingCount: totalPrompts - completedCount - (currentPrompt ? 1 : 0),
    };
  }

  private async loadContext(appRequestId: string) {
    const rules = await this.prisma.projectRuleSet.findUnique({ where: { appRequestId } });
    const screenIndex = await this.prisma.screenIndex.findUnique({ where: { appRequestId } });
    const screens: string[] = screenIndex ? JSON.parse(screenIndex.screens) : [];

    return { rules: rules?.content || '', screens, appRequestId };
  }

  private calculateTotalPrompts(context: { screens: string[] }): number {
    return 3 + context.screens.length + 3; // scaffolding + arch + auth + screens + logic + integrations + polish
  }

  private determinePhase(order: number, context: { screens: string[] }): string {
    if (order === 0) return 'scaffolding';
    if (order === 1) return 'architecture';
    if (order === 2) return 'auth';
    if (order < 3 + context.screens.length) return 'ui_screens';
    if (order === 3 + context.screens.length) return 'logic';
    if (order === 4 + context.screens.length) return 'integrations';
    return 'polish';
  }

  private getPhaseTitle(phase: string, order: number, context: { screens: string[] }): string {
    if (phase === 'scaffolding') return 'Project Scaffolding & Setup';
    if (phase === 'architecture') return 'Core Architecture & Database';
    if (phase === 'auth') return 'Authentication & Role System';
    if (phase === 'ui_screens') {
      const screenIndex = order - 3;
      return `UI Implementation: ${context.screens[screenIndex]}`;
    }
    if (phase === 'logic') return 'Business Logic & Services';
    if (phase === 'integrations') return 'Integrations & APIs';
    return 'Final Polish & Optimization';
  }

  private async generatePromptForPhase(
    appRequestId: string,
    phase: string,
    context: { rules: string; screens: string[]; appRequestId: string },
    order: number
  ): Promise<string> {
    if (!this.llmConfig.apiKey) {
      return this.generateFallbackPrompt(phase, context, order);
    }

    // LLM generation would go here
    return this.generateFallbackPrompt(phase, context, order);
  }

  private generateFallbackPrompt(
    phase: string,
    context: { rules: string; screens: string[] },
    order: number
  ): string {
    return `# Build Prompt: ${this.getPhaseTitle(phase, order, context)}

## Purpose
Implement ${phase} phase of the application.

## Scope (STRICT)
- Implement only what is defined in project rules
- Do NOT invent features
- Do NOT modify approved designs

## Inputs (Authoritative)
- Project Rules (MANDATORY - see below)
- Approved Screens
- Approved Mockups

## Required Outputs
- Code files as specified
- Passing tests

## Implementation Constraints
- Follow project rules exactly
- Use approved tech stack
- Maintain folder structure

## Verification Requirements
- All code must pass Phase 10 verification
- No errors allowed

## Git & Logging
- Commit with descriptive message
- Update project_log.md

## Stop Conditions
- If requirements conflict, STOP
- If rules unclear, STOP
- If scope exceeded, STOP

## Project Rules (BINDING)

${context.rules}`;
  }

  private async emitEvent(appRequestId: string, type: string, message: string): Promise<void> {
    const appRequest = await this.prisma.appRequest.findUnique({ where: { id: appRequestId } });
    if (appRequest?.executionId) {
      await this.prisma.executionEvent.create({
        data: { id: randomUUID(), executionId: appRequest.executionId, type, message },
      });
    }
  }

  private toPromptData(prompt: BuildPrompt): BuildPromptData {
    return {
      id: prompt.id,
      appRequestId: prompt.appRequestId,
      title: prompt.title,
      content: prompt.content,
      order: prompt.order,
      status: prompt.status as PromptStatusValue,
      createdAt: prompt.createdAt,
      approvedAt: prompt.approvedAt,
    };
  }
}
