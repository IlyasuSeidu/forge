/**
 * Forge Conductor - Master Orchestration Engine
 *
 * Purpose:
 * Deterministic control plane that orchestrates the multi-agent app building lifecycle.
 * Enforces strict state transitions, prevents parallel execution chaos, and supports
 * human-in-the-loop approval gates.
 *
 * ⚠️ CRITICAL RULES:
 * - NO AI/LLM logic - this is pure orchestration
 * - NO content generation
 * - NO business logic
 * - ONLY state machine enforcement
 * - ONLY coordination decisions
 *
 * Design Principles:
 * 1. Deterministic - same state + same data = same decision
 * 2. Single-Agent-at-a-Time - no parallel execution
 * 3. Explicit Transitions Only - no implicit state changes
 * 4. Human-in-the-Loop Friendly - supports pause + resume
 * 5. Verification-Safe - never bypasses Phase 10
 * 6. Extensible - future agents can plug in cleanly
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';
import type {
  NextAction,
  ConductorStateSnapshot,
  TransitionValidation,
} from './types.js';

/**
 * Allowed state transitions (STRICT STATE MACHINE)
 *
 * ⚠️ NO DYNAMIC TRANSITIONS
 * ⚠️ NO OVERRIDES
 * ⚠️ NO SHORTCUTS
 *
 * Each status maps to an array of valid next statuses.
 * Any transition not in this map is FORBIDDEN.
 */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  // Legacy support
  pending: ['idea', 'base_prompt_ready'], // Allow migration from legacy
  planned: ['planning', 'screens_defined'], // Allow migration from legacy

  // New conductor flow
  idea: ['base_prompt_ready'],
  base_prompt_ready: ['planning'],
  planning: ['screens_defined'],
  screens_defined: ['flows_defined'],
  flows_defined: ['designs_ready'],
  designs_ready: ['rules_locked'],
  rules_locked: ['build_prompts_ready'],
  build_prompts_ready: ['building'],
  building: ['verifying', 'failed'],
  verifying: ['completed', 'verification_failed'],

  // Terminal states (no transitions allowed)
  verification_failed: [],
  completed: [],
  failed: [],
};

/**
 * Agent mapping (PLACEHOLDER - no execution logic)
 *
 * Maps each status to the agent that should run NEXT.
 * This is pure coordination logic - agents are not executed here.
 */
const STATUS_TO_NEXT_AGENT: Record<string, string> = {
  idea: 'FoundryArchitect',
  base_prompt_ready: 'ProductStrategist',
  planning: 'ScreenCartographer',
  screens_defined: 'JourneyOrchestrator',
  flows_defined: 'VisualForge',
  designs_ready: 'ConstraintCompiler',
  rules_locked: 'BuildPromptEngineer',
  build_prompts_ready: 'ForgeImplementer',
  building: 'VerificationService', // Triggers Phase 10
  verifying: 'CompletionAuditor', // Placeholder for future
};

/**
 * Forge Conductor Service
 *
 * The master orchestrator for the multi-agent app building system.
 */
export class ForgeConductor {
  constructor(
    private prisma: PrismaClient,
    private logger: FastifyBaseLogger
  ) {
    this.logger.info('ForgeConductor initialized');
  }

  /**
   * Initialize conductor state for a new AppRequest
   *
   * Creates ConductorState and sets initial status to 'idea'
   *
   * @throws Error if state already exists
   */
  async initialize(appRequestId: string): Promise<ConductorStateSnapshot> {
    this.logger.info({ appRequestId }, 'Initializing conductor state');

    // Check if state already exists
    const existing = await this.prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (existing) {
      throw new Error(`ConductorState already exists for appRequestId: ${appRequestId}`);
    }

    // Create conductor state
    await this.prisma.conductorState.create({
      data: {
        id: randomUUID(),
        appRequestId,
        currentStatus: 'idea',
        locked: false,
        awaitingHuman: false,
        lastAgent: null,
      },
    });

    // Update AppRequest status to match
    await this.prisma.appRequest.update({
      where: { id: appRequestId },
      data: { status: 'idea' },
    });

    this.logger.info({
      appRequestId,
      status: 'idea',
    }, 'Conductor state initialized');

    return this.getStateSnapshot(appRequestId);
  }

  /**
   * Lock the conductor to prevent parallel agent execution
   *
   * MUST be called before any agent starts work
   */
  async lock(appRequestId: string): Promise<void> {
    this.logger.info({ appRequestId }, 'Locking conductor');

    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: { locked: true },
    });

    this.logger.debug({ appRequestId }, 'Conductor locked');
  }

  /**
   * Unlock the conductor to allow next agent execution
   *
   * MUST be called after agent completes (success or failure)
   */
  async unlock(appRequestId: string): Promise<void> {
    this.logger.info({ appRequestId }, 'Unlocking conductor');

    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: { locked: false },
    });

    this.logger.debug({ appRequestId }, 'Conductor unlocked');
  }

  /**
   * Pause for human approval
   *
   * Sets awaitingHuman flag and unlocks conductor
   * Agent execution will halt until resumeAfterHuman() is called
   */
  async pauseForHuman(appRequestId: string, reason?: string): Promise<void> {
    this.logger.info({ appRequestId, reason }, 'Pausing for human approval');

    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: {
        awaitingHuman: true,
        locked: false, // Unlock so system isn't stuck
      },
    });

    // Emit event if execution exists
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.emitEvent(
        appRequest.executionId,
        'conductor_paused_for_human',
        reason || 'Awaiting human approval to continue'
      );
    }

    this.logger.debug({ appRequestId }, 'Conductor paused for human');
  }

  /**
   * Resume after human approval
   *
   * Clears awaitingHuman flag to allow agent execution to continue
   */
  async resumeAfterHuman(appRequestId: string): Promise<void> {
    this.logger.info({ appRequestId }, 'Resuming after human approval');

    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: { awaitingHuman: false },
    });

    // Emit event if execution exists
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.emitEvent(
        appRequest.executionId,
        'conductor_resumed',
        'Human approval received - resuming orchestration'
      );
    }

    this.logger.debug({ appRequestId }, 'Conductor resumed');
  }

  /**
   * Validate if a state transition is allowed
   *
   * Pure function - no side effects
   */
  validateTransition(
    currentStatus: string,
    nextStatus: string
  ): TransitionValidation {
    const allowedTransitions = ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(nextStatus)) {
      return {
        valid: false,
        reason: `Invalid transition: ${currentStatus} → ${nextStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
        allowedTransitions,
      };
    }

    return {
      valid: true,
      allowedTransitions,
    };
  }

  /**
   * Transition to next status
   *
   * Validates transition using ALLOWED_TRANSITIONS map
   * Updates both ConductorState and AppRequest
   * Emits conductor_transition event
   *
   * @throws Error if transition is invalid
   */
  async transition(
    appRequestId: string,
    nextStatus: string,
    agentName?: string
  ): Promise<ConductorStateSnapshot> {
    this.logger.info({
      appRequestId,
      nextStatus,
      agentName,
    }, 'Attempting state transition');

    // Get current state
    const state = await this.prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (!state) {
      throw new Error(`ConductorState not found for appRequestId: ${appRequestId}`);
    }

    // Validate transition
    const validation = this.validateTransition(state.currentStatus, nextStatus);
    if (!validation.valid) {
      this.logger.error({
        appRequestId,
        currentStatus: state.currentStatus,
        nextStatus,
        reason: validation.reason,
      }, 'Invalid state transition rejected');
      throw new Error(validation.reason);
    }

    // Execute transition
    await this.prisma.conductorState.update({
      where: { appRequestId },
      data: {
        currentStatus: nextStatus,
        lastAgent: agentName || state.lastAgent,
      },
    });

    // Update AppRequest status
    await this.prisma.appRequest.update({
      where: { id: appRequestId },
      data: { status: nextStatus },
    });

    // Emit transition event
    const appRequest = await this.prisma.appRequest.findUnique({
      where: { id: appRequestId },
    });

    if (appRequest?.executionId) {
      await this.emitEvent(
        appRequest.executionId,
        'conductor_transition',
        `Transitioned from ${state.currentStatus} → ${nextStatus}${agentName ? ` (agent: ${agentName})` : ''}`
      );
    }

    this.logger.info({
      appRequestId,
      from: state.currentStatus,
      to: nextStatus,
      agent: agentName,
    }, 'State transition completed');

    return this.getStateSnapshot(appRequestId);
  }

  /**
   * Get next action decision
   *
   * Pure decision function - NO execution logic
   *
   * Returns what should happen next based on current state:
   * - run_agent: Which agent should run next
   * - await_human: Human approval required
   * - halt: Cannot proceed (locked, terminal state, etc.)
   */
  async getNextAction(appRequestId: string): Promise<NextAction> {
    this.logger.debug({ appRequestId }, 'Determining next action');

    const state = await this.prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (!state) {
      return {
        type: 'halt',
        reason: 'ConductorState not found',
      };
    }

    // Check if locked
    if (state.locked) {
      return {
        type: 'halt',
        reason: 'Conductor is locked - agent execution in progress',
      };
    }

    // Check if awaiting human
    if (state.awaitingHuman) {
      return {
        type: 'await_human',
        reason: 'Awaiting human approval to continue',
      };
    }

    // Check if terminal state
    const allowedTransitions = ALLOWED_TRANSITIONS[state.currentStatus] || [];
    if (allowedTransitions.length === 0) {
      return {
        type: 'halt',
        reason: `Terminal state reached: ${state.currentStatus}`,
      };
    }

    // Determine next agent
    const nextAgent = STATUS_TO_NEXT_AGENT[state.currentStatus];
    if (!nextAgent) {
      return {
        type: 'halt',
        reason: `No agent mapped for status: ${state.currentStatus}`,
      };
    }

    return {
      type: 'run_agent',
      agent: nextAgent,
      context: {
        currentStatus: state.currentStatus,
        allowedNextStates: allowedTransitions,
      },
    };
  }

  /**
   * Get current state snapshot
   *
   * Returns a read-only view of conductor state
   */
  async getStateSnapshot(appRequestId: string): Promise<ConductorStateSnapshot> {
    const state = await this.prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (!state) {
      throw new Error(`ConductorState not found for appRequestId: ${appRequestId}`);
    }

    const allowedTransitions = ALLOWED_TRANSITIONS[state.currentStatus] || [];

    return {
      appRequestId: state.appRequestId,
      currentStatus: state.currentStatus,
      locked: state.locked,
      awaitingHuman: state.awaitingHuman,
      lastAgent: state.lastAgent,
      canTransition: allowedTransitions.length > 0 && !state.locked && !state.awaitingHuman,
      allowedNextStates: allowedTransitions,
    };
  }

  /**
   * Emit execution event
   *
   * Internal helper to emit conductor events
   */
  private async emitEvent(
    executionId: string,
    type: string,
    message: string
  ): Promise<void> {
    await this.prisma.executionEvent.create({
      data: {
        id: randomUUID(),
        executionId,
        type,
        message,
      },
    });

    this.logger.debug({ executionId, type, message }, 'Event emitted');
  }
}
