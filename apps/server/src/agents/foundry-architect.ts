/**
 * Foundry Architect Agent
 *
 * Tier 1 - Strategy & Intent Agent
 *
 * Purpose:
 * Convert vague app ideas into a clean, structured, build-ready Base Prompt
 * through a guided, conversational process.
 *
 * Behavior:
 * - Asks a fixed sequence of structured questions
 * - One question at a time
 * - Stores all answers in database
 * - Generates draft Base Prompt from answers (string formatting only, NO AI)
 * - Requires human approval before proceeding
 *
 * Critical Rules:
 * - NO LLM calls
 * - NO assumptions
 * - NO code generation
 * - NO skipping questions
 * - ONLY runs when Conductor allows it (status = 'idea')
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';
import type { ForgeConductor } from '../conductor/forge-conductor.js';

/**
 * Foundry Session Status
 */
export type FoundrySessionStatus = 'asking' | 'awaiting_approval' | 'approved';

/**
 * Question schema - fixed order, never skip
 */
interface Question {
  id: string;
  question: string;
  optional: boolean;
}

/**
 * Answer map
 */
interface Answers {
  [questionId: string]: string;
}

/**
 * Current question response
 */
export interface CurrentQuestion {
  step: number;
  questionId: string;
  question: string;
  optional: boolean;
  totalQuestions: number;
}

/**
 * Foundry session summary
 */
export interface FoundrySessionSummary {
  id: string;
  appRequestId: string;
  status: FoundrySessionStatus;
  currentStep: number;
  totalSteps: number;
  answers: Answers;
  draftPrompt: string | null;
}

/**
 * Fixed question schema - NEVER modify order, NEVER skip
 */
const QUESTIONS: Question[] = [
  {
    id: 'product_name',
    question: 'What is the name of your product or app?',
    optional: false,
  },
  {
    id: 'one_sentence_concept',
    question: 'In one sentence, what does this app do?',
    optional: false,
  },
  {
    id: 'target_audience_pain',
    question: 'Who is this app for, and what problem does it solve for them?',
    optional: false,
  },
  {
    id: 'core_features',
    question: 'What are the core features or modules this app must have?',
    optional: false,
  },
  {
    id: 'required_pages',
    question: 'What main pages or screens do you expect this app to have?',
    optional: false,
  },
  {
    id: 'design_inspiration',
    question: 'Do you have any design inspiration or reference apps? (Optional - you can say "Not sure")',
    optional: true,
  },
  {
    id: 'preferred_tech',
    question: 'Do you have any preferred technologies or tools? (Optional - you can say "Not sure")',
    optional: true,
  },
  {
    id: 'scope_timeline',
    question: 'Is there any scope limit or timeline expectation? (Optional - you can say "Not sure")',
    optional: true,
  },
];

/**
 * Foundry Architect Agent
 *
 * The first agent in the multi-agent system.
 * Converts user ideas into structured Base Prompts.
 */
export class FoundryArchitect {
  constructor(
    private prisma: PrismaClient,
    private conductor: ForgeConductor,
    private logger: FastifyBaseLogger
  ) {
    this.logger.info('FoundryArchitect initialized');
  }

  /**
   * Start a new Foundry session
   *
   * Rules:
   * - Conductor must be in 'idea' status
   * - Creates FoundrySession with status='asking'
   * - Initializes answers as empty object
   * - Sets currentStep to 0
   *
   * @throws Error if conductor not in 'idea' status
   * @throws Error if session already exists
   */
  async start(appRequestId: string): Promise<FoundrySessionSummary> {
    this.logger.info({ appRequestId }, 'Starting Foundry session');

    // Verify conductor is in correct state
    const conductorState = await this.conductor.getStateSnapshot(appRequestId);
    if (conductorState.currentStatus !== 'idea') {
      throw new Error(
        `Cannot start Foundry session: Conductor is in '${conductorState.currentStatus}' status, expected 'idea'`
      );
    }

    // Check if session already exists
    const existing = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (existing) {
      throw new Error(`FoundrySession already exists for appRequestId: ${appRequestId}`);
    }

    // Lock conductor to prevent other agents
    await this.conductor.lock(appRequestId);

    // Create session
    const session = await this.prisma.foundrySession.create({
      data: {
        id: randomUUID(),
        appRequestId,
        status: 'asking',
        currentStep: 0,
        answers: JSON.stringify({}),
        draftPrompt: null,
      },
    });

    this.logger.info(
      {
        appRequestId,
        sessionId: session.id,
        status: session.status,
      },
      'Foundry session created'
    );

    return this.getSessionSummary(session);
  }

  /**
   * Get the current question
   *
   * Rules:
   * - Session must be in 'asking' status
   * - Returns question based on currentStep
   *
   * @throws Error if session not in 'asking' status
   * @throws Error if all questions answered (should be in 'awaiting_approval')
   */
  async getCurrentQuestion(appRequestId: string): Promise<CurrentQuestion> {
    this.logger.debug({ appRequestId }, 'Getting current question');

    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session) {
      throw new Error(`FoundrySession not found for appRequestId: ${appRequestId}`);
    }

    if (session.status !== 'asking') {
      throw new Error(
        `Cannot get question: Session is in '${session.status}' status, expected 'asking'`
      );
    }

    if (session.currentStep >= QUESTIONS.length) {
      throw new Error(
        'All questions have been answered. Session should be in awaiting_approval status.'
      );
    }

    const question = QUESTIONS[session.currentStep];

    return {
      step: session.currentStep,
      questionId: question!.id,
      question: question!.question,
      optional: question!.optional,
      totalQuestions: QUESTIONS.length,
    };
  }

  /**
   * Submit an answer to the current question
   *
   * Rules:
   * - Session must be in 'asking' status
   * - Answer is saved to answers object
   * - currentStep is incremented
   * - If last question answered:
   *   - Generate draft Base Prompt
   *   - Move to 'awaiting_approval'
   *   - Pause conductor for human approval
   *
   * @throws Error if session not in 'asking' status
   */
  async submitAnswer(appRequestId: string, answer: string): Promise<FoundrySessionSummary> {
    this.logger.info({ appRequestId, answerLength: answer.length }, 'Submitting answer');

    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session) {
      throw new Error(`FoundrySession not found for appRequestId: ${appRequestId}`);
    }

    if (session.status !== 'asking') {
      throw new Error(
        `Cannot submit answer: Session is in '${session.status}' status, expected 'asking'`
      );
    }

    if (session.currentStep >= QUESTIONS.length) {
      throw new Error('All questions have already been answered');
    }

    // Get current question and save answer
    const question = QUESTIONS[session.currentStep]!;
    const answers: Answers = JSON.parse(session.answers);
    answers[question.id] = answer.trim();

    this.logger.debug(
      {
        appRequestId,
        questionId: question.id,
        step: session.currentStep,
      },
      'Answer recorded'
    );

    // Increment step
    const nextStep = session.currentStep + 1;

    // Check if all questions answered
    if (nextStep >= QUESTIONS.length) {
      this.logger.info({ appRequestId }, 'All questions answered - generating draft Base Prompt');

      // Generate draft Base Prompt
      const draftPrompt = this.generateDraftBasePrompt(answers);

      // Update session to awaiting_approval
      const updatedSession = await this.prisma.foundrySession.update({
        where: { appRequestId },
        data: {
          answers: JSON.stringify(answers),
          currentStep: nextStep,
          status: 'awaiting_approval',
          draftPrompt,
        },
      });

      // Pause conductor for human approval
      await this.conductor.pauseForHuman(
        appRequestId,
        'Base Prompt draft ready - awaiting human approval'
      );

      // Unlock conductor (pauseForHuman auto-unlocks, but being explicit)
      await this.conductor.unlock(appRequestId);

      this.logger.info(
        { appRequestId, draftLength: draftPrompt.length },
        'Draft Base Prompt generated - awaiting approval'
      );

      return this.getSessionSummary(updatedSession);
    } else {
      // More questions remain - just save answer and increment step
      const updatedSession = await this.prisma.foundrySession.update({
        where: { appRequestId },
        data: {
          answers: JSON.stringify(answers),
          currentStep: nextStep,
        },
      });

      this.logger.debug(
        { appRequestId, nextStep, remaining: QUESTIONS.length - nextStep },
        'Moving to next question'
      );

      return this.getSessionSummary(updatedSession);
    }
  }

  /**
   * Generate draft Base Prompt from answers
   *
   * Pure string formatting - NO AI calls
   *
   * Structure:
   * - Product Name
   * - One-Sentence Concept
   * - Target Audience & Problem
   * - Core Features
   * - Required Pages/Screens
   * - Design Inspiration (optional)
   * - Preferred Tech Stack (optional)
   * - Scope/Timeline (optional)
   */
  private generateDraftBasePrompt(answers: Answers): string {
    const sections: string[] = [];

    // Product Name
    sections.push(`# ${answers.product_name || 'Untitled Product'}\n`);

    // One-Sentence Concept
    if (answers.one_sentence_concept) {
      sections.push(`## One-Sentence Concept\n\n${answers.one_sentence_concept}\n`);
    }

    // Target Audience & Problem
    if (answers.target_audience_pain) {
      sections.push(`## Target Audience & Problem\n\n${answers.target_audience_pain}\n`);
    }

    // Core Features
    if (answers.core_features) {
      sections.push(`## Core Features\n\n${answers.core_features}\n`);
    }

    // Required Pages/Screens
    if (answers.required_pages) {
      sections.push(`## Required Pages / Screens\n\n${answers.required_pages}\n`);
    }

    // Design Inspiration (optional)
    if (answers.design_inspiration && answers.design_inspiration.toLowerCase() !== 'not sure') {
      sections.push(`## Design Inspiration\n\n${answers.design_inspiration}\n`);
    }

    // Preferred Tech Stack (optional)
    if (answers.preferred_tech && answers.preferred_tech.toLowerCase() !== 'not sure') {
      sections.push(`## Preferred Tech Stack\n\n${answers.preferred_tech}\n`);
    }

    // Scope/Timeline (optional)
    if (answers.scope_timeline && answers.scope_timeline.toLowerCase() !== 'not sure') {
      sections.push(`## Scope / Timeline\n\n${answers.scope_timeline}\n`);
    }

    return sections.join('\n');
  }

  /**
   * Approve the Base Prompt
   *
   * Rules:
   * - Session must be in 'awaiting_approval' status
   * - Persists draft as artifact (base_prompt.md)
   * - Transitions conductor: idea → base_prompt_ready
   * - Marks session as 'approved'
   * - Resumes conductor
   *
   * @throws Error if session not in 'awaiting_approval' status
   */
  async approveBasePrompt(appRequestId: string): Promise<void> {
    this.logger.info({ appRequestId }, 'Approving Base Prompt');

    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session) {
      throw new Error(`FoundrySession not found for appRequestId: ${appRequestId}`);
    }

    if (session.status !== 'awaiting_approval') {
      throw new Error(
        `Cannot approve: Session is in '${session.status}' status, expected 'awaiting_approval'`
      );
    }

    if (!session.draftPrompt) {
      throw new Error('Cannot approve: No draft Base Prompt exists');
    }

    // Get AppRequest to find projectId for artifact
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (!appRequest) {
      throw new Error(`AppRequest not found: ${appRequestId}`);
    }

    // Save Base Prompt as artifact
    await this.prisma.artifact.create({
      data: {
        id: randomUUID(),
        projectId: appRequest.projectId,
        executionId: appRequest.executionId || undefined,
        path: 'base_prompt.md',
        type: 'base_prompt',
      },
    });

    // TODO: Actually save the content to filesystem when WorkspaceService is integrated
    // For now, we're just tracking it in the database

    this.logger.info({ appRequestId, path: 'base_prompt.md' }, 'Base Prompt artifact created');

    // Update session status to approved
    await this.prisma.foundrySession.update({
      where: { appRequestId },
      data: { status: 'approved' },
    });

    // Transition conductor: idea → base_prompt_ready
    await this.conductor.transition(appRequestId, 'base_prompt_ready', 'FoundryArchitect');

    // Resume conductor (clears awaitingHuman flag)
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info(
      { appRequestId, newStatus: 'base_prompt_ready' },
      'Base Prompt approved - Conductor transitioned'
    );
  }

  /**
   * Reject the Base Prompt and allow editing
   *
   * Rules:
   * - Session must be in 'awaiting_approval' status
   * - Keeps all answers
   * - Allows editing specific steps
   * - Resets status to 'asking'
   * - Does NOT advance conductor
   *
   * @param feedback Optional feedback on why rejected
   * @param resetToStep Optional - which step to reset to (default: 0)
   */
  async rejectBasePrompt(
    appRequestId: string,
    feedback?: string,
    resetToStep: number = 0
  ): Promise<FoundrySessionSummary> {
    this.logger.info({ appRequestId, feedback, resetToStep }, 'Rejecting Base Prompt');

    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session) {
      throw new Error(`FoundrySession not found for appRequestId: ${appRequestId}`);
    }

    if (session.status !== 'awaiting_approval') {
      throw new Error(
        `Cannot reject: Session is in '${session.status}' status, expected 'awaiting_approval'`
      );
    }

    if (resetToStep < 0 || resetToStep >= QUESTIONS.length) {
      throw new Error(`Invalid resetToStep: ${resetToStep}. Must be between 0 and ${QUESTIONS.length - 1}`);
    }

    // Reset session to asking mode
    const updatedSession = await this.prisma.foundrySession.update({
      where: { appRequestId },
      data: {
        status: 'asking',
        currentStep: resetToStep,
        draftPrompt: null, // Clear draft
      },
    });

    // Resume conductor (so it's not stuck waiting for approval)
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info(
      { appRequestId, resetToStep },
      'Base Prompt rejected - session reset to asking'
    );

    return this.getSessionSummary(updatedSession);
  }

  /**
   * Get session summary
   *
   * Helper to convert database model to summary object
   */
  private getSessionSummary(session: {
    id: string;
    appRequestId: string;
    status: string;
    currentStep: number;
    answers: string;
    draftPrompt: string | null;
  }): FoundrySessionSummary {
    return {
      id: session.id,
      appRequestId: session.appRequestId,
      status: session.status as FoundrySessionStatus,
      currentStep: session.currentStep,
      totalSteps: QUESTIONS.length,
      answers: JSON.parse(session.answers),
      draftPrompt: session.draftPrompt,
    };
  }

  /**
   * Get full session details
   */
  async getSession(appRequestId: string): Promise<FoundrySessionSummary | null> {
    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session) {
      return null;
    }

    return this.getSessionSummary(session);
  }
}
