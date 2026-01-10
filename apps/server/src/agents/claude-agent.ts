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
      // Claude Opus 4.5 supports up to 64K output tokens max
      // Using 32K for comprehensive tasks while staying well under API limits
      const response = await this.claudeService.complete({
        prompt,
        maxTokens: 32768,
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

## WEB APP DEVELOPMENT RULES (CRITICAL)
When building web applications (HTML/CSS/JavaScript), you MUST follow these rules to ensure the app works correctly:

### 1. HTML/JavaScript ID Consistency
- Every element ID referenced in JavaScript MUST exist in the HTML
- Example: If JS has \`document.getElementById('submit-btn')\`, HTML must have \`<button id="submit-btn">\`
- Double-check ALL querySelector, getElementById, getElementsByClassName calls match HTML
- Use browser console.log statements to help debug element references

### 2. File Path Rules
- ALWAYS use relative paths for resources: \`<link rel="stylesheet" href="styles.css">\`
- NEVER use absolute paths: ❌ \`href="/absolute/path/styles.css"\` ❌ \`href="file:///path"\`
- All files should be in the same directory or use relative paths like \`./assets/image.png\`
- Test that paths work when HTML is opened directly in browser

### 3. Self-Contained Apps
- All CSS should be in separate .css files OR inline in <style> tags
- All JavaScript should be in separate .js files OR inline in <script> tags
- External CDN libraries are OK (Bootstrap, jQuery, etc.) but prefer vanilla JS
- Don't reference assets that don't exist

### 4. Code Quality Standards
- Add proper error handling in JavaScript (try/catch)
- Validate user inputs before processing
- Add helpful console.log statements for debugging
- Comment complex logic
- Use modern JavaScript (ES6+) with const/let, arrow functions, etc.

### 5. Functional Requirements
- All buttons and interactive elements MUST have event listeners
- Forms must have submit handlers
- Navigation must work (if multi-view app)
- Test critical paths mentally before generating code

### 6. Structure for Single-Page Apps
If building a single-page app with multiple views:
\`\`\`html
<div id="view-home" class="view active">Home content</div>
<div id="view-settings" class="view hidden">Settings content</div>
\`\`\`
\`\`\`javascript
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
  } else {
    console.error(\`View \${viewId} not found\`);
  }
}
\`\`\`

### 7. Common Pitfalls to AVOID
❌ Referencing DOM elements before they're created
❌ Missing event listeners on buttons
❌ Using IDs in JS that don't exist in HTML
❌ Absolute file paths
❌ Missing error handling
❌ No validation on user input
❌ Forgetting to include CSS/JS files

### 8. Validation Checklist (Mental Review)
Before outputting files, mentally verify:
✓ Every \`getElementById()\` call matches an HTML element
✓ All file paths are relative
✓ All buttons have event listeners
✓ All views/sections have proper IDs
✓ CSS file is referenced correctly in HTML
✓ JS file is referenced correctly in HTML (at end of <body>)
✓ App can work when opened directly in a browser

## OUTPUT FORMAT
Respond with ONLY a JSON object in this exact format:

{
  "reasoning": "Brief explanation of your approach and validation performed",
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

Example 1 - Complete Working Web App:
{
  "reasoning": "Creating a functional calculator app with proper ID matching, relative paths, and event listeners",
  "files": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>\\n<html>\\n<head>\\n  <meta charset=\\"UTF-8\\">\\n  <title>Calculator</title>\\n  <link rel=\\"stylesheet\\" href=\\"styles.css\\">\\n</head>\\n<body>\\n  <div id=\\"calculator\\">\\n    <input type=\\"text\\" id=\\"display\\" readonly>\\n    <button id=\\"btn-1\\" class=\\"number\\">1</button>\\n    <button id=\\"btn-add\\" class=\\"operator\\">+</button>\\n  </div>\\n  <script src=\\"script.js\\"></script>\\n</body>\\n</html>",
      "type": "file"
    },
    {
      "path": "script.js",
      "content": "// Get elements - IDs match HTML\\nconst display = document.getElementById('display');\\nconst btn1 = document.getElementById('btn-1');\\nconst btnAdd = document.getElementById('btn-add');\\n\\nif (!display) console.error('Display element not found');\\n\\n// Add event listeners\\nbtn1.addEventListener('click', () => display.value += '1');\\nbtnAdd.addEventListener('click', () => display.value += '+');",
      "type": "file"
    },
    {
      "path": "styles.css",
      "content": "#calculator { max-width: 300px; margin: 50px auto; }\\n#display { width: 100%; font-size: 24px; }\\nbutton { width: 60px; height: 60px; }",
      "type": "file"
    }
  ],
  "success": true,
  "message": "Created functional calculator with validated ID matching and relative paths"
}

Example 2 - Task beyond capabilities:
{
  "reasoning": "Task requires database which is not available in sandbox",
  "files": [],
  "success": false,
  "message": "Cannot complete: task requires database access"
}

## YOUR TASK
Execute the task described above. Before generating files, mentally verify ID consistency and path correctness. Output ONLY valid JSON matching the format. No markdown, no explanations outside the JSON.`;
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
