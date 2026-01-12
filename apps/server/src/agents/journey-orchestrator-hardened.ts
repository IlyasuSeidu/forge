/**
 * Journey Orchestrator (Hardened) - Production Version
 *
 * Authority Level: BEHAVIORAL_AUTHORITY
 * Tier: 2 (Behavioral Structure)
 *
 * This agent defines WHO can do WHAT, WHERE, and in WHAT ORDER.
 * Controls authorization logic, security boundaries, and behavioral correctness.
 *
 * CRITICAL: LLMs must NEVER control role identifiers.
 * Any drift in role names creates catastrophic auth failures downstream.
 *
 * Production Hardening Features:
 * 1. PromptEnvelope - BEHAVIORAL_AUTHORITY with constitutional boundaries
 * 2. Context Isolation - Only approved docs by hash
 * 3. Closed Role Vocabulary - Roles from base prompt + planning docs only
 * 4. Role Canonicalization - Fail loudly on role name mismatch
 * 5. UserRoleContract - Schema enforcement for role definitions
 * 6. UserJourneyContract - Schema enforcement for journey steps
 * 7. Determinism Guarantees - Temperature ≤ 0.3, stable serialization
 * 8. Immutability - Hash-locking on approval
 * 9. Failure & Escalation - No silent fallbacks, loud failures
 * 10. Sequential Workflow - One role/journey at a time with approval gates
 */

import { PrismaClient, UserRoleDefinition, UserJourney } from '@prisma/client';
import { ForgeConductor } from '../conductor/forge-conductor';
import { FastifyBaseLogger } from 'fastify';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

// PART 1: PromptEnvelope (Constitutional Boundaries)
interface PromptEnvelope {
  agentName: 'JourneyOrchestrator';
  agentVersion: '1.0.0';
  authorityLevel: 'BEHAVIORAL_AUTHORITY';

  allowedActions: [
    'defineUserRoles',
    'defineRolePermissions',
    'defineUserJourneys'
  ];

  forbiddenActions: [
    'inventRoles',            // NO hallucination
    'renameRoles',            // NO mutation
    'modifyScreens',          // Screen Cartographer's authority
    'accessMockups',          // Visual Forge's authority
    'accessRules',            // Constraint Compiler's authority
    'accessCode',             // Implementer's authority
    'inferPermissions',       // Must be explicit
    'auto-correctAmbiguity'   // Escalate to human
  ];
}

// PART 3: Closed Role Vocabulary
export type CanonicalRole = string; // Role names from vocabulary only

// PART 5: User Role Contract
export interface UserRoleContract {
  roleName: CanonicalRole;
  description: string;
  permissions: string[];          // What this role can do
  accessibleScreens: string[];    // Screens this role can access
  forbiddenScreens: string[];     // Screens explicitly forbidden
}

// PART 5: User Role Table Contract (All roles together)
export interface UserRoleTableContract {
  roles: UserRoleContract[];
}

// PART 6: Journey Step Contract
export interface JourneyStep {
  order: number;
  screen: string;              // MUST be canonical screen name
  action: string;              // What user does on this screen
  outcome: string;             // What happens after action
}

// PART 6: User Journey Contract
export interface UserJourneyContract {
  roleName: CanonicalRole;
  steps: JourneyStep[];
}

// Status enum
enum JourneyStatus {
  DRAFT = 'draft',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
}

// LLM Configuration
interface LLMConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model: string;
  temperature: number;  // MUST be ≤ 0.3 for determinism
  maxTokens: number;
  retryAttempts: number;
}

/**
 * Journey Orchestrator (Hardened)
 *
 * Production-grade implementation with:
 * - Closed role vocabulary (LLMs NEVER control role identifiers)
 * - Role and journey canonicalization
 * - Hash-based immutability
 * - Sequential approval workflow
 * - Context isolation by hash
 * - Deterministic LLM calls
 */
export class JourneyOrchestratorHardened {
  private readonly envelope: PromptEnvelope = {
    agentName: 'JourneyOrchestrator',
    agentVersion: '1.0.0',
    authorityLevel: 'BEHAVIORAL_AUTHORITY',
    allowedActions: [
      'defineUserRoles',
      'defineRolePermissions',
      'defineUserJourneys',
    ],
    forbiddenActions: [
      'inventRoles',
      'renameRoles',
      'modifyScreens',
      'accessMockups',
      'accessRules',
      'accessCode',
      'inferPermissions',
      'auto-correctAmbiguity',
    ],
  };

  constructor(
    private readonly prisma: PrismaClient,
    private readonly conductor: ForgeConductor,
    private readonly logger: FastifyBaseLogger,
    private readonly llmConfig: LLMConfig
  ) {
    // PART 7: Validate temperature constraint
    if (llmConfig.temperature > 0.3) {
      throw new Error(
        `DETERMINISM VIOLATION: Temperature ${llmConfig.temperature} exceeds maximum 0.3`
      );
    }
  }

  /**
   * PART 1: Validate Envelope
   *
   * Ensures this agent operates within its constitutional boundaries.
   */
  private validateEnvelope(): void {
    if (this.envelope.agentName !== 'JourneyOrchestrator') {
      throw new Error('ENVELOPE VIOLATION: Wrong agent name');
    }

    if (this.envelope.authorityLevel !== 'BEHAVIORAL_AUTHORITY') {
      throw new Error('ENVELOPE VIOLATION: Wrong authority level');
    }

    this.logger.debug({ envelope: this.envelope }, 'Envelope validated');
  }

  /**
   * PART 2: Validate Context Access
   *
   * Ensures agent ONLY accesses approved documents by hash.
   */
  private validateContextAccess(
    basePromptHash: string,
    planningDocsHash: string,
    screenIndexHash: string
  ): void {
    if (!basePromptHash || !planningDocsHash || !screenIndexHash) {
      throw new Error(
        'CONTEXT ISOLATION VIOLATION: Missing required document hashes'
      );
    }

    this.logger.debug(
      {
        basePromptHash: basePromptHash.substring(0, 16) + '...',
        planningDocsHash: planningDocsHash.substring(0, 16) + '...',
        screenIndexHash: screenIndexHash.substring(0, 16) + '...',
      },
      'Context access validated'
    );
  }

  /**
   * Emit Event (Log)
   *
   * Logs events for tracking. Conductor emitEvent is private, so we log instead.
   */
  private logEvent(
    appRequestId: string,
    type: string,
    message: string
  ): void {
    this.logger.info({ appRequestId, type, message }, 'Journey Orchestrator Event');
  }

  /**
   * PART 3: Extract Allowed Role Names from Planning Docs + Base Prompt
   *
   * CRITICAL: LLMs must NEVER invent role identifiers.
   * This method extracts canonical role names from approved documents.
   *
   * Sources (in order of precedence):
   * 1. Base Prompt (explicit role names from Foundry answers)
   * 2. Master Plan (roles mentioned in planning)
   * 3. Implementation Plan (roles mentioned in implementation)
   * 4. Standard vocabulary (Guest, User, Admin - ONLY if justified)
   */
  private extractAllowedRoles(
    basePrompt: string,
    masterPlan: string,
    implPlan: string
  ): string[] {
    const allowedRoles = new Set<string>();

    // Standard vocabulary (ONLY if justified by planning docs)
    // Start with minimal set - we'll only include these if they appear in docs
    const potentialStandardRoles = [
      'Guest',
      'User',
      'Admin',
      'Member',
      'Owner',
    ];

    // Extract from base prompt (explicit answers)
    // Look for role names in patterns like "User, Admin, Guest"
    const basePromptRoles = this.extractRoleNamesFromText(basePrompt);
    basePromptRoles.forEach(role => allowedRoles.add(role));

    // Extract from planning docs
    const planningRoles = this.extractRoleNamesFromText(masterPlan + '\n' + implPlan);
    planningRoles.forEach(role => allowedRoles.add(role));

    // Only add standard roles if they appear in the docs
    potentialStandardRoles.forEach(role => {
      const roleLower = role.toLowerCase();
      const allText = (basePrompt + masterPlan + implPlan).toLowerCase();
      if (allText.includes(roleLower)) {
        allowedRoles.add(role);
      }
    });

    const sorted = Array.from(allowedRoles).sort();

    this.logger.debug(
      { allowedCount: sorted.length, allowed: sorted.slice(0, 10) },
      'Extracted allowed role names (closed vocabulary)'
    );

    return sorted;
  }

  /**
   * Extract Role Names from Text
   *
   * Uses heuristics to find role names in natural language.
   * Looks for capitalized phrases that appear to be role names.
   */
  private extractRoleNamesFromText(text: string): string[] {
    const roles: string[] = [];

    // Pattern 1: "Roles: Admin, User, Guest" or "User roles:"
    const listPattern = /(?:roles?|user types?|actors?)[\s:]+([A-Z][^.!?]*?)(?:\.|$)/gi;
    let match;
    while ((match = listPattern.exec(text)) !== null) {
      if (match[1]) {
        const items = match[1].split(',').map(s => s.trim());
        items.forEach(item => {
          if (item && /^[A-Z]/.test(item)) {
            roles.push(item);
          }
        });
      }
    }

    // Pattern 2: Quoted role names "Admin" or 'User'
    const quotedPattern = /["']([A-Z][A-Za-z]{2,20})["']/g;
    while ((match = quotedPattern.exec(text)) !== null) {
      const word = match[1];
      // Filter out common words that aren't roles
      if (word && !this.isCommonPhrase(word)) {
        roles.push(word);
      }
    }

    // Pattern 3: Title Case single words that might be roles
    const titleCasePattern = /\b([A-Z][a-z]{2,20})\b/g;
    while ((match = titleCasePattern.exec(text)) !== null) {
      const word = match[1];
      // Only include if it looks like a role (appears multiple times or in role context)
      if (word && this.looksLikeRole(word, text)) {
        roles.push(word);
      }
    }

    // Deduplicate and clean
    const unique = Array.from(new Set(roles));
    return unique.filter(role => role.length >= 3 && role.length <= 30);
  }

  /**
   * Check if word looks like a role based on context
   */
  private looksLikeRole(word: string, text: string): boolean {
    const roleLower = word.toLowerCase();

    // Common role keywords
    const roleKeywords = [
      'user', 'admin', 'guest', 'member', 'owner', 'manager',
      'moderator', 'editor', 'viewer', 'contributor', 'subscriber',
      'customer', 'vendor', 'client', 'staff', 'employee'
    ];

    // Check if word is or contains a role keyword
    if (roleKeywords.some(keyword => roleLower.includes(keyword))) {
      return true;
    }

    // Check if word appears near role-related terms
    const wordPattern = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(wordPattern);
    if (matches && matches.length >= 2) {
      // Word appears multiple times - likely significant
      return true;
    }

    return false;
  }

  /**
   * Check if phrase is a common phrase (not a role name)
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'The User',
      'The System',
      'This Feature',
      'Each User',
      'All Users',
      'Master Plan',
      'Implementation Plan',
      'Base Prompt',
      'User Interface',
      'User Experience',
      'Task',
      'Project',
      'Dashboard',
      'Screen',
      'Page',
    ];

    return commonPhrases.some(common =>
      phrase.toLowerCase() === common.toLowerCase() ||
      phrase.toLowerCase().includes(common.toLowerCase())
    );
  }

  /**
   * PART 4: Canonicalize Role Name
   *
   * CRITICAL: Enforces that LLM output matches EXACTLY one allowed role.
   * This eliminates pluralization drift ("Admins" vs "Admin").
   *
   * Rules:
   * - Case-insensitive matching
   * - Exact match required (no fuzzy matching)
   * - Throws error if no match found
   */
  private canonicalizeRoleName(
    rawName: string,
    allowedRoles: string[]
  ): string {
    const normalized = rawName.trim().toLowerCase();

    // Exact match (case-insensitive)
    const match = allowedRoles.find(
      role => role.toLowerCase() === normalized
    );

    if (match) {
      return match;
    }

    // No match found - FAIL LOUDLY
    throw new Error(
      `ROLE NAME CANONICALIZATION FAILURE: "${rawName}" is not in the allowed vocabulary.\n` +
      `Allowed roles: ${allowedRoles.slice(0, 20).join(', ')}${allowedRoles.length > 20 ? '...' : ''}\n` +
      `LLMs must NOT invent role identifiers. This is a security boundary violation.`
    );
  }

  /**
   * PART 5: Compute Document Hash
   *
   * SHA-256 hash for immutability.
   */
  private computeDocumentHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Get Base Prompt Content
   */
  private async getBasePrompt(appRequestId: string): Promise<string> {
    const session = await this.prisma.foundrySession.findUnique({
      where: { appRequestId },
    });

    if (!session || session.status !== 'approved' || !session.draftPrompt) {
      throw new Error('Base prompt not found or not approved');
    }

    return session.draftPrompt;
  }

  /**
   * Get Planning Docs with Hashes
   *
   * PART 2: Context Isolation - Only access approved docs by hash
   */
  private async getPlanningDocsWithHash(appRequestId: string): Promise<{
    masterPlan: string;
    masterPlanHash: string;
    implPlan: string;
    implPlanHash: string;
    basePromptHash: string;
    planningDocsHash: string;
  }> {
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

    if (!masterPlan.documentHash || !implPlan.documentHash || !masterPlan.basePromptHash) {
      throw new Error('Planning documents not locked (missing hashes)');
    }

    const planningDocsHash = this.computeDocumentHash(
      masterPlan.content + '\n' + implPlan.content
    );

    return {
      masterPlan: masterPlan.content,
      masterPlanHash: masterPlan.documentHash,
      implPlan: implPlan.content,
      implPlanHash: implPlan.documentHash,
      basePromptHash: masterPlan.basePromptHash,
      planningDocsHash,
    };
  }

  /**
   * Get Screen Index with Hash
   *
   * PART 2: Context Isolation - Only access approved screen index
   */
  private async getScreenIndexWithHash(appRequestId: string): Promise<{
    screenIndex: string[];
    screenIndexHash: string;
  }> {
    const screenIndex = await this.prisma.screenIndex.findUnique({
      where: { appRequestId },
    });

    if (!screenIndex) {
      throw new Error('Screen Index not found');
    }

    if (screenIndex.status !== 'approved') {
      throw new Error('Screen Index not approved');
    }

    if (!screenIndex.screenIndexHash) {
      throw new Error('Screen Index not locked (missing hash)');
    }

    return {
      screenIndex: JSON.parse(screenIndex.screens),
      screenIndexHash: screenIndex.screenIndexHash,
    };
  }

  /**
   * Call Anthropic API
   *
   * PART 7: Deterministic LLM calls (temperature ≤ 0.3)
   */
  private async callAnthropic(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (this.llmConfig.provider !== 'anthropic') {
      throw new Error('Invalid provider for Anthropic call');
    }

    const anthropic = new Anthropic({ apiKey: this.llmConfig.apiKey });

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.llmConfig.retryAttempts; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: this.llmConfig.model,
          max_tokens: this.llmConfig.maxTokens,
          temperature: this.llmConfig.temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        const content = response.content[0];
        if (!content || content.type !== 'text') {
          throw new Error('Unexpected response type from Anthropic');
        }

        return content.text;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          { attempt, maxAttempts: this.llmConfig.retryAttempts, error: lastError.message },
          'Anthropic API call failed, retrying...'
        );

        if (attempt < this.llmConfig.retryAttempts) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Anthropic API call failed after ${this.llmConfig.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Parse User Role Table Response
   *
   * Extracts JSON from LLM response (handles markdown code blocks)
   */
  private parseUserRoleTableResponse(response: string): UserRoleTableContract {
    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response;

    if (!jsonText) {
      throw new Error('No JSON content found in response');
    }

    try {
      const parsed = JSON.parse(jsonText.trim());
      return parsed as UserRoleTableContract;
    } catch (error) {
      throw new Error(`Failed to parse User Role Table JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse User Journey Response
   *
   * Extracts JSON from LLM response (handles markdown code blocks)
   */
  private parseUserJourneyResponse(response: string): UserJourneyContract {
    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response;

    if (!jsonText) {
      throw new Error('No JSON content found in response');
    }

    try {
      const parsed = JSON.parse(jsonText.trim());
      return parsed as UserJourneyContract;
    } catch (error) {
      throw new Error(`Failed to parse User Journey JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * PART 5: Validate User Role Table Contract
   *
   * Ensures all required fields are present and properly formatted.
   */
  private validateUserRoleTableContract(contract: UserRoleTableContract): void {
    if (!contract.roles || !Array.isArray(contract.roles)) {
      throw new Error('CONTRACT VIOLATION: User Role Table must have "roles" array');
    }

    if (contract.roles.length === 0) {
      throw new Error('CONTRACT VIOLATION: User Role Table must have at least one role');
    }

    contract.roles.forEach((role, index) => {
      if (!role.roleName || typeof role.roleName !== 'string') {
        throw new Error(`CONTRACT VIOLATION: Role #${index + 1} missing "roleName"`);
      }

      if (!role.description || typeof role.description !== 'string') {
        throw new Error(`CONTRACT VIOLATION: Role "${role.roleName}" missing "description"`);
      }

      if (!role.permissions || !Array.isArray(role.permissions)) {
        throw new Error(`CONTRACT VIOLATION: Role "${role.roleName}" missing "permissions" array`);
      }

      if (!role.accessibleScreens || !Array.isArray(role.accessibleScreens)) {
        throw new Error(`CONTRACT VIOLATION: Role "${role.roleName}" missing "accessibleScreens" array`);
      }

      if (!role.forbiddenScreens || !Array.isArray(role.forbiddenScreens)) {
        throw new Error(`CONTRACT VIOLATION: Role "${role.roleName}" missing "forbiddenScreens" array`);
      }
    });

    this.logger.debug({ roleCount: contract.roles.length }, 'User Role Table contract validated');
  }

  /**
   * PART 6: Validate User Journey Contract
   *
   * Ensures all required fields are present and steps are properly ordered.
   */
  private validateUserJourneyContract(
    contract: UserJourneyContract,
    screenIndex: string[]
  ): void {
    if (!contract.roleName || typeof contract.roleName !== 'string') {
      throw new Error('CONTRACT VIOLATION: User Journey missing "roleName"');
    }

    if (!contract.steps || !Array.isArray(contract.steps)) {
      throw new Error(`CONTRACT VIOLATION: Journey for "${contract.roleName}" missing "steps" array`);
    }

    if (contract.steps.length === 0) {
      throw new Error(`CONTRACT VIOLATION: Journey for "${contract.roleName}" must have at least one step`);
    }

    contract.steps.forEach((step, index) => {
      if (typeof step.order !== 'number') {
        throw new Error(`CONTRACT VIOLATION: Step #${index + 1} missing "order"`);
      }

      if (step.order !== index + 1) {
        throw new Error(
          `CONTRACT VIOLATION: Step order mismatch. Expected ${index + 1}, got ${step.order}`
        );
      }

      if (!step.screen || typeof step.screen !== 'string') {
        throw new Error(`CONTRACT VIOLATION: Step #${step.order} missing "screen"`);
      }

      if (!step.action || typeof step.action !== 'string') {
        throw new Error(`CONTRACT VIOLATION: Step #${step.order} missing "action"`);
      }

      if (!step.outcome || typeof step.outcome !== 'string') {
        throw new Error(`CONTRACT VIOLATION: Step #${step.order} missing "outcome"`);
      }

      // CRITICAL: Screen name MUST exist in Screen Index
      if (!screenIndex.includes(step.screen)) {
        throw new Error(
          `CONTRACT VIOLATION: Step #${step.order} references unknown screen "${step.screen}". ` +
          `Must be one of: ${screenIndex.slice(0, 10).join(', ')}${screenIndex.length > 10 ? '...' : ''}`
        );
      }
    });

    this.logger.debug(
      { roleName: contract.roleName, stepCount: contract.steps.length },
      'User Journey contract validated'
    );
  }

  /**
   * PART 7: Serialize User Role Table (Deterministic Markdown)
   *
   * Converts contract to stable, hash-able markdown format.
   */
  private serializeUserRoleTable(contract: UserRoleTableContract): string {
    let markdown = '# User Roles\n\n';

    // Sort roles alphabetically for determinism
    const sortedRoles = [...contract.roles].sort((a, b) =>
      a.roleName.localeCompare(b.roleName)
    );

    sortedRoles.forEach(role => {
      markdown += `## ${role.roleName}\n\n`;
      markdown += `**Description**: ${role.description}\n\n`;

      markdown += `**Permissions**:\n`;
      if (role.permissions.length === 0) {
        markdown += `- None\n`;
      } else {
        role.permissions.forEach(permission => {
          markdown += `- ${permission}\n`;
        });
      }
      markdown += `\n`;

      markdown += `**Accessible Screens**:\n`;
      if (role.accessibleScreens.length === 0) {
        markdown += `- None\n`;
      } else {
        role.accessibleScreens.forEach(screen => {
          markdown += `- ${screen}\n`;
        });
      }
      markdown += `\n`;

      markdown += `**Forbidden Screens**:\n`;
      if (role.forbiddenScreens.length === 0) {
        markdown += `- None\n`;
      } else {
        role.forbiddenScreens.forEach(screen => {
          markdown += `- ${screen}\n`;
        });
      }
      markdown += `\n`;
    });

    return markdown.trim();
  }

  /**
   * PART 7: Serialize User Journey (Deterministic Markdown)
   *
   * Converts contract to stable, hash-able markdown format.
   */
  private serializeUserJourney(contract: UserJourneyContract): string {
    let markdown = `# User Journey: ${contract.roleName}\n\n`;

    contract.steps.forEach(step => {
      markdown += `## Step ${step.order}\n\n`;
      markdown += `**Screen**: ${step.screen}\n\n`;
      markdown += `**Action**: ${step.action}\n\n`;
      markdown += `**Outcome**: ${step.outcome}\n\n`;
    });

    return markdown.trim();
  }

  /**
   * PART 8: Generate User Role Table Contract (Phase 1)
   *
   * Uses LLM to generate role definitions with closed vocabulary.
   */
  private async generateUserRoleTableContract(
    basePrompt: string,
    masterPlan: string,
    implPlan: string,
    screenIndex: string[],
    allowedRoles: string[]
  ): Promise<UserRoleTableContract> {
    const systemPrompt = `You are a senior product architect generating User Role Definitions.

CRITICAL RULES:
- You may ONLY use role names from the allowed vocabulary provided below
- DO NOT rename, pluralize, or invent new role names
- DO NOT use synonyms or variations
- Define permissions based ONLY on what's in the planning docs
- Use ONLY screens from the provided Screen Index
- NO code generation
- NO UI design
- NO feature invention

ALLOWED ROLE NAMES (CLOSED VOCABULARY):
${allowedRoles.map((role, i) => `${i + 1}. ${role}`).join('\n')}

SCREEN INDEX (Available Screens):
${screenIndex.map((screen, i) => `${i + 1}. ${screen}`).join('\n')}

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "roles": [
    {
      "roleName": "string (from allowed vocabulary)",
      "description": "string",
      "permissions": ["array", "of", "permission", "strings"],
      "accessibleScreens": ["array", "of", "screen", "names"],
      "forbiddenScreens": ["array", "of", "screen", "names"]
    }
  ]
}

Every roleName MUST be from the allowed vocabulary (exact match, case-sensitive).
Every screen name MUST be from the Screen Index (exact match, case-sensitive).

NO additional text outside the JSON object.`;

    const userPrompt = `Base Prompt:\n\n${basePrompt}\n\n---\n\nMaster Plan:\n\n${masterPlan}\n\n---\n\nImplementation Plan:\n\n${implPlan}\n\n---\n\nGenerate User Role Definitions. Remember: Respond with ONLY a valid JSON object.`;

    this.logger.debug('Generating User Role Table via LLM...');
    const response = await this.callAnthropic(systemPrompt, userPrompt);

    const rawContract = this.parseUserRoleTableResponse(response);

    // PART 4: Canonicalize ALL role names
    rawContract.roles = rawContract.roles.map(role => ({
      ...role,
      roleName: this.canonicalizeRoleName(role.roleName, allowedRoles),
    }));

    this.validateUserRoleTableContract(rawContract);

    return rawContract;
  }

  /**
   * PART 8: Generate User Journey Contract (Phase 2)
   *
   * Uses LLM to generate journey for a specific role.
   */
  private async generateUserJourneyContract(
    basePrompt: string,
    masterPlan: string,
    implPlan: string,
    roleName: string,
    screenIndex: string[]
  ): Promise<UserJourneyContract> {
    const systemPrompt = `You are a senior product architect generating a User Journey for the "${roleName}" role.

CRITICAL RULES:
- Define ONLY what's described in the planning docs for this role
- Use ONLY screens from the provided Screen Index
- Steps must be sequential (order: 1, 2, 3, ...)
- Each step MUST have: order, screen, action, outcome
- NO code generation
- NO UI design
- NO feature invention
- Focus on WHAT the user does, not HOW it's implemented

SCREEN INDEX (Available Screens):
${screenIndex.map((screen, i) => `${i + 1}. ${screen}`).join('\n')}

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "roleName": "${roleName}",
  "steps": [
    {
      "order": 1,
      "screen": "string (from Screen Index)",
      "action": "string (what user does)",
      "outcome": "string (what happens next)"
    }
  ]
}

Every screen name MUST be from the Screen Index (exact match, case-sensitive).
Steps MUST be numbered sequentially starting from 1.

NO additional text outside the JSON object.`;

    const userPrompt = `Base Prompt:\n\n${basePrompt}\n\n---\n\nMaster Plan:\n\n${masterPlan}\n\n---\n\nImplementation Plan:\n\n${implPlan}\n\n---\n\nGenerate User Journey for role: ${roleName}. Remember: Respond with ONLY a valid JSON object.`;

    this.logger.debug({ roleName }, 'Generating User Journey via LLM...');
    const response = await this.callAnthropic(systemPrompt, userPrompt);

    const rawContract = this.parseUserJourneyResponse(response);

    this.validateUserJourneyContract(rawContract, screenIndex);

    return rawContract;
  }

  /**
   * PART 10: Start - Phase 1 (Generate User Role Table)
   *
   * Sequential workflow:
   * 1. Validate envelope
   * 2. Validate context access
   * 3. Extract closed role vocabulary
   * 4. Generate User Role Table via LLM
   * 5. Save as DRAFT
   * 6. Pause Conductor for human approval
   */
  async start(appRequestId: string): Promise<UserRoleDefinition> {
    this.validateEnvelope();

    this.logEvent(appRequestId, 'journey_orchestrator_started', 'Defining user roles...');

    // PART 2: Context Isolation - get approved docs by hash
    const basePrompt = await this.getBasePrompt(appRequestId);
    const basePromptHash = this.computeDocumentHash(basePrompt);

    const {
      masterPlan,
      implPlan,
      planningDocsHash,
    } = await this.getPlanningDocsWithHash(appRequestId);

    const { screenIndex, screenIndexHash } = await this.getScreenIndexWithHash(appRequestId);

    this.validateContextAccess(basePromptHash, planningDocsHash, screenIndexHash);

    // PART 3: Extract closed role vocabulary
    const allowedRoles = this.extractAllowedRoles(basePrompt, masterPlan, implPlan);

    this.logger.debug(
      { allowedRoleCount: allowedRoles.length },
      'Extracted allowed roles (closed vocabulary)'
    );

    // PART 8: Generate User Role Table via LLM
    const contract = await this.generateUserRoleTableContract(
      basePrompt,
      masterPlan,
      implPlan,
      screenIndex,
      allowedRoles
    );

    // PART 7: Serialize to deterministic markdown
    const serialized = this.serializeUserRoleTable(contract);

    // PART 8: Save as DRAFT (no hash yet)
    const roleTable = await this.prisma.userRoleDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId,
        content: serialized,
        status: JourneyStatus.AWAITING_APPROVAL,
        roleTableVersion: 1,
        roleTableHash: null, // Not locked yet
        basePromptHash,
        planningDocsHash,
        screenIndexHash,
        approvedBy: null,
      },
    });

    this.logEvent(
      appRequestId,
      'user_role_table_generated',
      `Generated User Role Table with ${contract.roles.length} roles (awaiting approval)`
    );

    // PART 10: Pause Conductor for human approval
    await this.conductor.pauseForHuman(appRequestId, 'journey_orchestrator:role_table_approval');

    this.logger.info(
      { appRequestId, roleTableId: roleTable.id, roleCount: contract.roles.length },
      'User Role Table generated and awaiting approval'
    );

    return roleTable;
  }

  /**
   * PART 10: Approve User Role Table
   *
   * Locks the role table hash (immutability).
   */
  async approveUserRoleTable(
    appRequestId: string,
    approvedBy: string = 'human'
  ): Promise<UserRoleDefinition> {
    const roleTable = await this.prisma.userRoleDefinition.findFirst({
      where: {
        appRequestId,
        status: JourneyStatus.AWAITING_APPROVAL,
      },
    });

    if (!roleTable) {
      throw new Error('No User Role Table awaiting approval');
    }

    if (roleTable.roleTableHash) {
      throw new Error('User Role Table already approved and locked');
    }

    // PART 8: Compute hash (immutability lock)
    const contentHash = this.computeDocumentHash(roleTable.content);

    const updated = await this.prisma.userRoleDefinition.update({
      where: { id: roleTable.id },
      data: {
        status: JourneyStatus.APPROVED,
        roleTableHash: contentHash,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    this.logEvent(
      appRequestId,
      'user_role_table_approved',
      `User Role Table approved and hash-locked: ${contentHash.substring(0, 16)}...`
    );

    // Resume Conductor to proceed to Phase 2 (journeys)
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info(
      { appRequestId, roleTableId: updated.id, hash: contentHash.substring(0, 16) },
      'User Role Table approved and hash-locked'
    );

    return updated;
  }

  /**
   * PART 10: Describe Next Journey (Phase 2)
   *
   * Sequential workflow:
   * 1. Find next role without approved journey
   * 2. Generate journey for that role via LLM
   * 3. Save as DRAFT
   * 4. Pause Conductor for human approval
   */
  async describeNextJourney(appRequestId: string): Promise<UserJourney> {
    this.validateEnvelope();

    // Get approved Role Table
    const roleTable = await this.prisma.userRoleDefinition.findFirst({
      where: {
        appRequestId,
        status: JourneyStatus.APPROVED,
      },
    });

    if (!roleTable || !roleTable.roleTableHash) {
      throw new Error('User Role Table not approved yet');
    }

    // Parse roles from content
    const roleNames = this.extractRoleNamesFromRoleTable(roleTable.content);

    // Find existing journeys
    const existingJourneys = await this.prisma.userJourney.findMany({
      where: { appRequestId },
    });

    const existingRoleNames = existingJourneys.map(j => j.roleName);
    const nextRoleName = roleNames.find(name => !existingRoleNames.includes(name));

    if (!nextRoleName) {
      throw new Error('All journeys already generated');
    }

    this.logEvent(
      appRequestId,
      'journey_generation_started',
      `Generating journey for role: ${nextRoleName}`
    );

    // Get context
    const basePrompt = await this.getBasePrompt(appRequestId);
    const basePromptHash = this.computeDocumentHash(basePrompt);

    const { masterPlan, implPlan, planningDocsHash } = await this.getPlanningDocsWithHash(appRequestId);
    const { screenIndex, screenIndexHash } = await this.getScreenIndexWithHash(appRequestId);

    this.validateContextAccess(basePromptHash, planningDocsHash, screenIndexHash);

    // Generate journey via LLM
    const contract = await this.generateUserJourneyContract(
      basePrompt,
      masterPlan,
      implPlan,
      nextRoleName,
      screenIndex
    );

    // Serialize to deterministic markdown
    const serialized = this.serializeUserJourney(contract);

    // Calculate order (next in sequence)
    const maxOrder = existingJourneys.reduce((max, j) => Math.max(max, j.order), 0);
    const order = maxOrder + 1;

    // Save as DRAFT
    const journey = await this.prisma.userJourney.create({
      data: {
        id: randomUUID(),
        appRequestId,
        roleName: nextRoleName,
        content: serialized,
        order,
        status: JourneyStatus.AWAITING_APPROVAL,
        journeyVersion: 1,
        journeyHash: null, // Not locked yet
        roleTableHash: roleTable.roleTableHash,
        screenIndexHash,
        basePromptHash,
        planningDocsHash,
        approvedBy: null,
      },
    });

    this.logEvent(
      appRequestId,
      'journey_generated',
      `Generated journey for "${nextRoleName}" with ${contract.steps.length} steps (awaiting approval)`
    );

    // Pause Conductor for human approval
    await this.conductor.pauseForHuman(appRequestId, `journey_orchestrator:journey_approval:${nextRoleName}`);

    this.logger.info(
      { appRequestId, journeyId: journey.id, roleName: nextRoleName, stepCount: contract.steps.length },
      'User Journey generated and awaiting approval'
    );

    return journey;
  }

  /**
   * Extract Role Names from Role Table Content
   *
   * Helper to parse role names from markdown content.
   */
  private extractRoleNamesFromRoleTable(content: string): string[] {
    const roleNames: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match lines like "## Admin" or "## User"
      const match = line.match(/^##\s+(.+)$/);
      if (match && match[1]) {
        roleNames.push(match[1].trim());
      }
    }

    return roleNames;
  }

  /**
   * PART 10: Approve Current Journey
   *
   * Locks the journey hash (immutability).
   * Checks if all journeys are complete.
   */
  async approveCurrentJourney(
    appRequestId: string,
    approvedBy: string = 'human'
  ): Promise<{ journey: UserJourney; allComplete: boolean }> {
    const journey = await this.prisma.userJourney.findFirst({
      where: {
        appRequestId,
        status: JourneyStatus.AWAITING_APPROVAL,
      },
      orderBy: { order: 'asc' },
    });

    if (!journey) {
      throw new Error('No User Journey awaiting approval');
    }

    if (journey.journeyHash) {
      throw new Error('User Journey already approved and locked');
    }

    // Compute hash (immutability lock)
    const contentHash = this.computeDocumentHash(journey.content);

    const updated = await this.prisma.userJourney.update({
      where: { id: journey.id },
      data: {
        status: JourneyStatus.APPROVED,
        journeyHash: contentHash,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    this.logEvent(
      appRequestId,
      'journey_approved',
      `Journey for "${journey.roleName}" approved and hash-locked: ${contentHash.substring(0, 16)}...`
    );

    // Check if all journeys complete
    const roleTable = await this.prisma.userRoleDefinition.findFirst({
      where: { appRequestId, status: JourneyStatus.APPROVED },
    });

    if (!roleTable) {
      throw new Error('Role Table not found');
    }

    const totalRoles = this.extractRoleNamesFromRoleTable(roleTable.content).length;
    const approvedJourneys = await this.prisma.userJourney.count({
      where: { appRequestId, status: JourneyStatus.APPROVED },
    });

    const allComplete = approvedJourneys === totalRoles;

    if (allComplete) {
      this.logEvent(
        appRequestId,
        'all_journeys_complete',
        `All ${totalRoles} user journeys approved and hash-locked`
      );
    }

    // Resume Conductor
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info(
      {
        appRequestId,
        journeyId: updated.id,
        roleName: updated.roleName,
        hash: contentHash.substring(0, 16),
        allComplete,
      },
      'User Journey approved and hash-locked'
    );

    return {
      journey: updated,
      allComplete,
    };
  }

  /**
   * PART 9: Reject Current Journey
   *
   * Deletes the draft journey and allows re-generation.
   */
  async rejectCurrentJourney(appRequestId: string, reason: string): Promise<void> {
    const journey = await this.prisma.userJourney.findFirst({
      where: {
        appRequestId,
        status: JourneyStatus.AWAITING_APPROVAL,
      },
      orderBy: { order: 'asc' },
    });

    if (!journey) {
      throw new Error('No User Journey awaiting approval');
    }

    if (journey.journeyHash) {
      throw new Error('IMMUTABILITY VIOLATION: Cannot reject approved journey');
    }

    await this.prisma.userJourney.delete({
      where: { id: journey.id },
    });

    this.logEvent(
      appRequestId,
      'journey_rejected',
      `Journey for "${journey.roleName}" rejected: ${reason}`
    );

    // Resume Conductor (can call describeNextJourney again)
    await this.conductor.resumeAfterHuman(appRequestId);

    this.logger.info(
      { appRequestId, journeyId: journey.id, roleName: journey.roleName, reason },
      'User Journey rejected and deleted'
    );
  }

  /**
   * PART 9: Verify Journey Integrity
   *
   * Recomputes hashes to ensure content hasn't been tampered with.
   */
  async verifyJourneyIntegrity(journeyId: string): Promise<boolean> {
    const journey = await this.prisma.userJourney.findUnique({
      where: { id: journeyId },
    });

    if (!journey) {
      throw new Error('Journey not found');
    }

    if (!journey.journeyHash) {
      throw new Error('Journey not locked (no hash to verify)');
    }

    const recomputedHash = this.computeDocumentHash(journey.content);

    const isValid = recomputedHash === journey.journeyHash;

    this.logger.info(
      {
        journeyId,
        roleName: journey.roleName,
        storedHash: journey.journeyHash.substring(0, 16),
        recomputedHash: recomputedHash.substring(0, 16),
        isValid,
      },
      'Journey integrity verification'
    );

    return isValid;
  }
}

