import Anthropic from '@anthropic-ai/sdk';
import type { FastifyBaseLogger } from 'fastify';
import crypto from 'node:crypto';

export interface ClaudeRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * ClaudeService abstracts Claude API calls
 * Handles API communication, error handling, and logging
 */
export class ClaudeService {
  private client: Anthropic | null = null;
  private logger: FastifyBaseLogger;
  private enabled: boolean;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ClaudeService' });
    this.enabled = !!process.env.ANTHROPIC_API_KEY;

    if (this.enabled) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.logger.info('ClaudeService initialized with API key');
    } else {
      this.logger.warn(
        'ClaudeService disabled: ANTHROPIC_API_KEY not set'
      );
    }
  }

  /**
   * Check if Claude service is available
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Call Claude API with a prompt
   */
  async complete(request: ClaudeRequest): Promise<ClaudeResponse> {
    if (!this.isEnabled()) {
      throw new Error(
        'Claude service is not enabled. Set ANTHROPIC_API_KEY environment variable.'
      );
    }

    const startTime = Date.now();
    const promptHash = crypto
      .createHash('sha256')
      .update(request.prompt)
      .digest('hex')
      .slice(0, 16);

    this.logger.info(
      {
        promptHash,
        maxTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 1.0,
      },
      'Calling Claude API'
    );

    try {
      const response = await this.client!.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 1.0,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const duration = Date.now() - startTime;

      // Extract text content from response
      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('\n');

      const result: ClaudeResponse = {
        content,
        model: response.model,
        stopReason: response.stop_reason || 'unknown',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };

      this.logger.info(
        {
          promptHash,
          model: result.model,
          stopReason: result.stopReason,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          duration,
        },
        'Claude API call completed'
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        {
          promptHash,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Claude API call failed'
      );

      throw error;
    }
  }
}
