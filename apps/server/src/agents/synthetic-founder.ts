/**
 * Synthetic Founder Agent
 *
 * Tier 1 - Strategy & Intent Agent (AI-powered)
 *
 * Purpose:
 * Acts as a reasonable, opinionated startup founder to answer
 * Foundry Architect questions on behalf of the user.
 *
 * Behavior:
 * - Proposes answers to Foundry Architect questions one at a time
 * - Calls GPT-5 (Reasoning/Planning mode) for product intuition
 * - Presents proposed answers for human approval/adjustment
 * - Keeps momentum high without burdening the human
 *
 * Critical Rules:
 * - ONE question at a time (never batch)
 * - NO skipping questions
 * - NO inventing scope beyond reason
 * - NO overriding the human
 * - Does NOT advance the Conductor
 * - Does NOT approve anything (human must approve)
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';
import type { FoundryArchitect } from './foundry-architect.js';

/**
 * Synthetic Answer Status
 */
export type SyntheticAnswerStatus = 'proposed' | 'approved' | 'adjusted';

/**
 * Proposed answer response
 */
export interface ProposedAnswer {
  id: string;
  step: number;
  question: string;
  proposedAnswer: string;
  status: SyntheticAnswerStatus;
}

/**
 * GPT-5 API Configuration
 */
interface GPT5Config {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Base Prompt Context for GPT-5
 * (Partial - no downstream knowledge)
 */
interface PromptContext {
  productName?: string;
  concept?: string;
  previousAnswers: Record<string, string>;
}

/**
 * Synthetic Founder Agent
 *
 * First LLM-backed agent in Forge.
 * Generates reasonable default answers to accelerate Foundry phase.
 */
export class SyntheticFounder {
  private gpt5Config: GPT5Config;

  constructor(
    private prisma: PrismaClient,
    private foundryArchitect: FoundryArchitect,
    private logger: FastifyBaseLogger,
    config?: Partial<GPT5Config>
  ) {
    this.gpt5Config = {
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
      model: config?.model || 'gpt-4o',  // Using GPT-4o as GPT-5 placeholder
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens || 500,
    };

    this.logger.info('SyntheticFounder initialized with GPT-5 config');
  }

  /**
   * Propose an answer to the current Foundry question
   *
   * Rules:
   * - Gets current question from Foundry Architect
   * - Calls GPT-5 with question + previous answers
   * - Generates concise, reasonable answer
   * - Saves as proposed (status=proposed)
   * - Returns proposed answer for human review
   *
   * Important:
   * - Must instruct GPT-5: "Answer as a competent startup founder. Be concise. Avoid unnecessary features."
   * - For optional questions without context: suggest "Not sure" or reasonable skip
   *
   * @throws Error if Foundry session not in 'asking' status
   * @throws Error if no current question available
   */
  async proposeAnswer(appRequestId: string): Promise<ProposedAnswer> {
    this.logger.info({ appRequestId }, 'Proposing answer via Synthetic Founder');

    // Get current question from Foundry Architect
    const question = await this.foundryArchitect.getCurrentQuestion(appRequestId);

    this.logger.debug(
      { appRequestId, step: question.step, questionId: question.questionId },
      'Retrieved current question'
    );

    // Get Foundry session for previous answers
    const session = await this.foundryArchitect.getSession(appRequestId);
    if (!session) {
      throw new Error(`FoundrySession not found for appRequestId: ${appRequestId}`);
    }

    // Build context from previous answers
    const context: PromptContext = {
      productName: session.answers.product_name,
      concept: session.answers.one_sentence_concept,
      previousAnswers: session.answers,
    };

    this.logger.debug(
      { appRequestId, contextKeys: Object.keys(context.previousAnswers) },
      'Built prompt context from previous answers'
    );

    // Call GPT-5 to generate proposed answer
    const proposedAnswer = await this.callGPT5(question.question, question.optional, context);

    this.logger.info(
      {
        appRequestId,
        questionId: question.questionId,
        proposedLength: proposedAnswer.length,
      },
      'GPT-5 generated proposed answer'
    );

    // Save proposed answer to database
    const syntheticAnswer = await this.prisma.syntheticAnswer.create({
      data: {
        id: randomUUID(),
        appRequestId,
        foundrySessionId: session.id,
        step: question.step,
        question: question.question,
        proposedAnswer,
        finalAnswer: null,
        status: 'proposed',
      },
    });

    this.logger.info(
      { appRequestId, syntheticAnswerId: syntheticAnswer.id, status: 'proposed' },
      'Proposed answer saved to database'
    );

    return {
      id: syntheticAnswer.id,
      step: question.step,
      question: question.question,
      proposedAnswer: syntheticAnswer.proposedAnswer,
      status: 'proposed',
    };
  }

  /**
   * Approve the proposed answer
   *
   * Rules:
   * - Mark status = approved
   * - Set finalAnswer = proposedAnswer
   * - Submit answer to Foundry Architect
   * - Proceed to next question
   *
   * Important:
   * - Does NOT advance Conductor
   * - Does NOT skip questions
   * - Simply feeds approved answer back to Foundry
   *
   * @throws Error if answer not found
   * @throws Error if answer not in 'proposed' status
   */
  async approveProposedAnswer(answerId: string): Promise<void> {
    this.logger.info({ answerId }, 'Approving proposed answer');

    const answer = await this.prisma.syntheticAnswer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      throw new Error(`SyntheticAnswer not found: ${answerId}`);
    }

    if (answer.status !== 'proposed') {
      throw new Error(
        `Cannot approve: Answer is in '${answer.status}' status, expected 'proposed'`
      );
    }

    // Update to approved status
    await this.prisma.syntheticAnswer.update({
      where: { id: answerId },
      data: {
        status: 'approved',
        finalAnswer: answer.proposedAnswer,
      },
    });

    this.logger.debug({ answerId, finalAnswer: answer.proposedAnswer }, 'Answer approved');

    // Submit answer to Foundry Architect
    await this.foundryArchitect.submitAnswer(answer.appRequestId, answer.proposedAnswer);

    this.logger.info(
      { answerId, appRequestId: answer.appRequestId, step: answer.step },
      'Approved answer submitted to Foundry Architect'
    );
  }

  /**
   * Adjust the proposed answer with human revision
   *
   * Rules:
   * - Mark status = adjusted
   * - Set finalAnswer = revisedText (human's edit)
   * - Submit revised answer to Foundry Architect
   *
   * @throws Error if answer not found
   * @throws Error if answer not in 'proposed' status
   */
  async adjustProposedAnswer(answerId: string, revisedText: string): Promise<void> {
    this.logger.info({ answerId, revisedLength: revisedText.length }, 'Adjusting proposed answer');

    const answer = await this.prisma.syntheticAnswer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      throw new Error(`SyntheticAnswer not found: ${answerId}`);
    }

    if (answer.status !== 'proposed') {
      throw new Error(
        `Cannot adjust: Answer is in '${answer.status}' status, expected 'proposed'`
      );
    }

    // Update to adjusted status
    await this.prisma.syntheticAnswer.update({
      where: { id: answerId },
      data: {
        status: 'adjusted',
        finalAnswer: revisedText.trim(),
      },
    });

    this.logger.debug(
      { answerId, originalAnswer: answer.proposedAnswer, finalAnswer: revisedText },
      'Answer adjusted by human'
    );

    // Submit revised answer to Foundry Architect
    await this.foundryArchitect.submitAnswer(answer.appRequestId, revisedText.trim());

    this.logger.info(
      { answerId, appRequestId: answer.appRequestId, step: answer.step },
      'Adjusted answer submitted to Foundry Architect'
    );
  }

  /**
   * Get proposed answer by ID
   */
  async getProposedAnswer(answerId: string): Promise<ProposedAnswer | null> {
    const answer = await this.prisma.syntheticAnswer.findUnique({
      where: { id: answerId },
    });

    if (!answer) {
      return null;
    }

    return {
      id: answer.id,
      step: answer.step,
      question: answer.question,
      proposedAnswer: answer.proposedAnswer,
      status: answer.status as SyntheticAnswerStatus,
    };
  }

  /**
   * Get all synthetic answers for an app request
   */
  async getAllAnswers(appRequestId: string): Promise<ProposedAnswer[]> {
    const answers = await this.prisma.syntheticAnswer.findMany({
      where: { appRequestId },
      orderBy: { step: 'asc' },
    });

    return answers.map(answer => ({
      id: answer.id,
      step: answer.step,
      question: answer.question,
      proposedAnswer: answer.proposedAnswer,
      status: answer.status as SyntheticAnswerStatus,
    }));
  }

  /**
   * Call GPT-5 to generate a proposed answer
   *
   * Prompt Strategy:
   * - Identity: "You are a competent startup founder"
   * - Goal: Answer product strategy questions
   * - Constraints: Be concise, avoid unnecessary features
   * - Context: Previous answers (if any)
   *
   * For optional questions:
   * - If no clear context: suggest "Not sure" or reasonable default
   * - Don't invent unnecessary complexity
   *
   * @private
   */
  private async callGPT5(
    question: string,
    optional: boolean,
    context: PromptContext
  ): Promise<string> {
    // Build system prompt
    const systemPrompt = `You are a competent startup founder answering product strategy questions.

Rules:
- Be concise (1-3 sentences maximum)
- Avoid unnecessary features or over-engineering
- Focus on core value proposition
- For optional questions without clear context, suggest "Not sure" rather than inventing details
- Answer naturally as if in a conversation

Context so far:
${Object.entries(context.previousAnswers)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}
`;

    const userPrompt = optional
      ? `${question}\n\nNote: This is optional. If you don't have a clear, simple answer based on the context, just say "Not sure".`
      : question;

    this.logger.debug(
      { question, optional, contextSize: Object.keys(context.previousAnswers).length },
      'Calling GPT-5 for answer proposal'
    );

    try {
      // Call OpenAI API (GPT-4o as GPT-5 placeholder)
      const response = await this.callOpenAI(systemPrompt, userPrompt);

      this.logger.debug(
        { question, responseLength: response.length },
        'GPT-5 response received'
      );

      return response.trim();
    } catch (error) {
      this.logger.error({ error, question }, 'GPT-5 API call failed');

      // Fallback: return reasonable default for optional questions
      if (optional) {
        return 'Not sure';
      }

      throw new Error(`Failed to generate proposed answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call OpenAI API
   *
   * @private
   */
  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.gpt5Config.apiKey) {
      this.logger.warn('OpenAI API key not configured - using fallback mode');
      // Fallback for testing without API key
      return this.generateFallbackAnswer(userPrompt);
    }

    const requestBody = {
      model: this.gpt5Config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.gpt5Config.temperature,
      max_tokens: this.gpt5Config.maxTokens,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.gpt5Config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const message = data.choices?.[0]?.message?.content as string | undefined;

    if (!message) {
      throw new Error('No response from OpenAI API');
    }

    return message;
  }

  /**
   * Generate fallback answer when API is not available
   * (Used for testing/demo purposes)
   *
   * @private
   */
  private generateFallbackAnswer(question: string): string {
    // Simple heuristic-based fallback for testing
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('name')) {
      return 'TaskFlow Pro';
    }
    if (lowerQuestion.includes('one sentence') || lowerQuestion.includes('what does')) {
      return 'A productivity app for managing tasks and workflows';
    }
    if (lowerQuestion.includes('who') && lowerQuestion.includes('problem')) {
      return 'Professionals and teams who need better task organization and collaboration';
    }
    if (lowerQuestion.includes('core features')) {
      return 'Task creation, assignment, deadlines, notifications, team collaboration';
    }
    if (lowerQuestion.includes('pages') || lowerQuestion.includes('screens')) {
      return 'Dashboard, task list, task detail, team view, settings';
    }
    if (lowerQuestion.includes('design') && lowerQuestion.includes('optional')) {
      return 'Not sure';
    }
    if (lowerQuestion.includes('tech') && lowerQuestion.includes('optional')) {
      return 'Not sure';
    }
    if (lowerQuestion.includes('scope') || lowerQuestion.includes('timeline')) {
      return 'Not sure';
    }

    return 'Not sure';
  }
}
