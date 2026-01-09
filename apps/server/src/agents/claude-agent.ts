import type { FastifyBaseLogger } from 'fastify';
import type { Agent, AgentContext, AgentResult } from './types.js';
import type { Task } from '../models/index.js';
import { ClaudeService } from '../services/claude-service.js';

interface ClaudeTaskOutput {
  reasoning: string;
  files?: Array<{
    path: string;
    content: string;
    type: 'file' | 'directory';
  }>;
  success: boolean;
  message: string;
}

/**
 * ClaudeAgent uses Claude AI to execute tasks
 * Implements strict safety controls and workspace isolation
 */
export class ClaudeAgent implements Agent {
  name = 'claude';
  private claudeService: ClaudeService;
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ agent: 'ClaudeAgent' });
    this.claudeService = new ClaudeService(logger);
  }

  /**
   * ClaudeAgent can handle tasks that involve code, apps, APIs, features, or UIs
   */
  canHandle(task: Task): boolean {
    if (!this.claudeService.isEnabled()) {
      return false;
    }

    const keywords = [
      'code',
      'app',
      'api',
      'feature',
      'ui',
      'function',
      'class',
      'server',
      'client',
      'build',
      'create',
      'implement',
      'develop',
      'write',
    ];

    const taskText = `${task.title} ${task.description}`.toLowerCase();
    return keywords.some((keyword) => taskText.includes(keyword));
  }

  /**
   * Execute task using Claude AI
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    this.logger.info(
      { taskId: task.id, title: task.title },
      'ClaudeAgent executing task'
    );

    try {
      // Build strict prompt with safety constraints
      const prompt = this.buildPrompt(task, context);

      // Call Claude API
      const response = await this.claudeService.complete({
        prompt,
        maxTokens: 8192,
        temperature: 0.7,
      });

      this.logger.info(
        {
          taskId: task.id,
          model: response.model,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
        },
        'Claude API response received'
      );

      // Parse Claude's response
      const taskOutput = this.parseResponse(response.content);

      // Execute file operations using WorkspaceService
      if (taskOutput.files && taskOutput.files.length > 0) {
        for (const file of taskOutput.files) {
          if (file.type === 'directory') {
            await context.createDirectory(file.path);
            this.logger.info({ path: file.path }, 'Created directory');
          } else {
            await context.writeFile(file.path, file.content);
            this.logger.info({ path: file.path }, 'Created file');
          }
        }
      }

      // Return result
      if (taskOutput.success) {
        return {
          success: true,
          message: taskOutput.message,
          metadata: {
            reasoning: taskOutput.reasoning,
            filesCreated: taskOutput.files?.length || 0,
            model: response.model,
            tokensUsed:
              response.usage.inputTokens + response.usage.outputTokens,
          },
        };
      } else {
        return {
          success: false,
          message: taskOutput.message,
          error: 'Claude indicated task could not be completed',
          metadata: {
            reasoning: taskOutput.reasoning,
          },
        };
      }
    } catch (error) {
      this.logger.error(
        { taskId: task.id, error },
        'ClaudeAgent execution failed'
      );

      return {
        success: false,
        message: 'AI agent execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build prompt with strict safety constraints
   */
  private buildPrompt(task: Task, context: AgentContext): string {
    return `You are an AI agent executing a task within a sandboxed workspace. You have LIMITED capabilities and MUST follow these rules:

## TASK DETAILS
Title: ${task.title}
Description: ${task.description}

## WORKSPACE CONSTRAINTS
- You can ONLY create files and directories in the workspace
- Workspace path: ${context.workspacePath}
- You CANNOT execute shell commands
- You CANNOT access files outside the workspace
- You CANNOT make network requests
- You CANNOT install packages or dependencies

## SAFETY RULES
1. If the task requires capabilities you don't have, respond with success=false
2. If you're unsure about requirements, respond with success=false
3. Never attempt to bypass workspace isolation
4. Only create files that are directly required for the task
5. Use relative paths only (e.g., "src/index.ts", not "/absolute/path")

## OUTPUT FORMAT
Respond with ONLY a JSON object in this exact format:

{
  "reasoning": "Brief explanation of your approach",
  "files": [
    {
      "path": "relative/path/to/file.txt",
      "content": "file content here",
      "type": "file"
    }
  ],
  "success": true,
  "message": "Task completed successfully"
}

## EXAMPLES

Example 1 - Simple file creation:
{
  "reasoning": "Creating a README as requested",
  "files": [
    {
      "path": "README.md",
      "content": "# Project\\n\\nThis is a sample project.",
      "type": "file"
    }
  ],
  "success": true,
  "message": "Created README.md"
}

Example 2 - Multiple files:
{
  "reasoning": "Creating Express server with basic structure",
  "files": [
    {
      "path": "src",
      "content": "",
      "type": "directory"
    },
    {
      "path": "src/server.js",
      "content": "const express = require('express');\\nconst app = express();\\n\\napp.get('/', (req, res) => res.send('Hello'));\\n\\napp.listen(3000);",
      "type": "file"
    }
  ],
  "success": true,
  "message": "Created Express server"
}

Example 3 - Task beyond capabilities:
{
  "reasoning": "Task requires database which is not available in sandbox",
  "files": [],
  "success": false,
  "message": "Cannot complete: task requires database access"
}

## YOUR TASK
Execute the task described above. Output ONLY valid JSON matching the format. No markdown, no explanations outside the JSON.`;
  }

  /**
   * Parse Claude's response into structured output
   */
  private parseResponse(content: string): ClaudeTaskOutput {
    try {
      // Remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n/, '');
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n/, '');
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.replace(/\n```$/, '');
      }

      const parsed = JSON.parse(cleanedContent) as ClaudeTaskOutput;

      // Validate required fields
      if (
        typeof parsed.success !== 'boolean' ||
        typeof parsed.message !== 'string' ||
        typeof parsed.reasoning !== 'string'
      ) {
        throw new Error('Invalid response structure');
      }

      return parsed;
    } catch (error) {
      this.logger.error({ error, content }, 'Failed to parse Claude response');

      // Return failure result if parsing fails
      return {
        reasoning: 'Failed to parse AI response',
        success: false,
        message: 'AI returned invalid response format',
      };
    }
  }
}
