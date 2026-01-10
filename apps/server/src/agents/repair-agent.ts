import type { FastifyBaseLogger } from 'fastify';
import { ClaudeService } from '../services/claude-service.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

interface RepairInput {
  verificationErrors: string[];
  workspacePath: string;
  attempt: number;
}

interface RepairOutput {
  success: boolean;
  patches: Array<{
    filePath: string;
    newContent: string;
  }>;
  reasoning: string;
  error?: string;
}

/**
 * RepairAgent uses Claude AI to fix verification failures
 * ONLY runs after verification fails - never during initial build
 * Makes minimal, targeted fixes to resolve specific errors
 */
export class RepairAgent {
  name = 'repair';
  private claudeService: ClaudeService;
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ agent: 'RepairAgent' });
    this.claudeService = new ClaudeService(logger);
  }

  /**
   * Attempt to repair verification failures
   * @param input - Verification errors and workspace context
   * @returns Patches to apply to fix the errors
   */
  async repair(input: RepairInput): Promise<RepairOutput> {
    this.logger.info(
      { errorCount: input.verificationErrors.length, attempt: input.attempt },
      'RepairAgent starting repair attempt'
    );

    try {
      // Read all files from workspace to provide context
      const workspaceFiles = await this.readWorkspaceFiles(input.workspacePath);

      // Build strict repair prompt
      const prompt = this.buildRepairPrompt(input, workspaceFiles);

      // Call Claude API with strict constraints
      const response = await this.claudeService.complete({
        prompt,
        maxTokens: 16384, // Smaller than build - repairs should be targeted
        temperature: 0.3, // Lower temperature for more conservative fixes
      });

      // Parse response
      const parsed = this.parseRepairResponse(response.content);

      if (parsed.success) {
        this.logger.info(
          { patchCount: parsed.patches.length },
          'RepairAgent generated patches'
        );
      } else {
        this.logger.warn({ error: parsed.error }, 'RepairAgent failed to generate patches');
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: message }, 'RepairAgent crashed');

      return {
        success: false,
        patches: [],
        reasoning: '',
        error: `Repair crashed: ${message}`,
      };
    }
  }

  /**
   * Read all files from workspace to provide context for repair
   */
  private async readWorkspaceFiles(workspacePath: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    try {
      const entries = await fs.readdir(workspacePath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(workspacePath, entry.name);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            files[entry.name] = content;
          } catch (error) {
            this.logger.warn({ file: entry.name, error }, 'Could not read file');
          }
        }
      }

      this.logger.info({ fileCount: Object.keys(files).length }, 'Read workspace files for repair');
    } catch (error) {
      this.logger.error({ workspacePath, error }, 'Failed to read workspace directory');
    }

    return files;
  }

  /**
   * STEP 2: Build strict repair prompt with safety constraints
   */
  private buildRepairPrompt(
    input: RepairInput,
    workspaceFiles: Record<string, string>
  ): string {
    const fileContentsSection = Object.entries(workspaceFiles)
      .map(([fileName, content]) => `=== ${fileName} ===\n${content}`)
      .join('\n\n');

    return `You are a repair agent for a code generation system. An app was generated but failed verification with the following errors:

${input.verificationErrors.map((err, i) => `${i + 1}. ${err}`).join('\n')}

Your task is to fix ONLY these specific errors. This is repair attempt ${input.attempt} of 3.

STRICT RULES:
1. Fix ONLY the errors listed above - nothing else
2. Do NOT add new features or functionality
3. Do NOT change user experience or UI design
4. Do NOT modify files that aren't related to the errors
5. Make minimal, targeted changes
6. Preserve existing code structure and style
7. Do NOT create new files unless absolutely required to fix the error
8. Do NOT remove working functionality

CURRENT FILES IN WORKSPACE:
${fileContentsSection}

RESPONSE FORMAT:
You must respond with valid JSON only, in this exact format:

{
  "reasoning": "Brief explanation of what you're fixing and why",
  "patches": [
    {
      "filePath": "index.html",
      "newContent": "... complete new file content ..."
    }
  ]
}

IMPORTANT:
- Include the COMPLETE new content for each file you're patching
- Do not use placeholders like "... rest of file ..."
- Each patch must contain the full file content, not just the changed lines
- If you need to fix an error in index.html, include the entire new index.html
- Only include files that need to be changed

Analyze the errors carefully and provide the minimal patches needed to fix them.

Respond with JSON only:`;
  }

  /**
   * Parse Claude's repair response
   */
  private parseRepairResponse(response: string): RepairOutput {
    try {
      // Extract JSON from response (Claude might add markdown formatting)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
      }

      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.reasoning || !Array.isArray(parsed.patches)) {
        return {
          success: false,
          patches: [],
          reasoning: '',
          error: 'Invalid response structure: missing reasoning or patches array',
        };
      }

      // Validate each patch
      for (const patch of parsed.patches) {
        if (!patch.filePath || typeof patch.newContent !== 'string') {
          return {
            success: false,
            patches: [],
            reasoning: parsed.reasoning,
            error: 'Invalid patch structure: missing filePath or newContent',
          };
        }
      }

      return {
        success: true,
        patches: parsed.patches,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: message }, 'Failed to parse repair response');

      return {
        success: false,
        patches: [],
        reasoning: '',
        error: `Failed to parse response: ${message}`,
      };
    }
  }
}
