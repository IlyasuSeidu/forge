/**
 * Forge Conductor Types
 *
 * Defines the strict state machine and orchestration types
 * for the Forge multi-agent system.
 *
 * ⚠️ CRITICAL: This is a control plane, not an intelligence layer.
 * NO AI logic. NO LLM calls. ONLY orchestration.
 */

/**
 * AppRequest lifecycle status
 *
 * STRICT STATE MACHINE - transitions are controlled by ALLOWED_TRANSITIONS map
 */
export type AppRequestStatus =
  | 'idea'                    // Initial state - user has an idea
  | 'base_prompt_ready'       // Foundry Architect completed base prompt
  | 'planning'                // Product Strategist is planning
  | 'screens_defined'         // Screen Cartographer defined screens
  | 'flows_defined'           // Journey Orchestrator defined flows
  | 'designs_ready'           // Visual Forge generated mockups
  | 'rules_locked'            // Constraint Compiler locked development rules
  | 'build_prompts_ready'     // Build Prompt Engineer created prompts
  | 'building'                // Forge Implementer executing build
  | 'verifying'               // Phase 10 verification running
  | 'completed'               // App verified and ready
  | 'verification_failed'     // Verification failed after max attempts
  | 'failed';                 // Build failed

/**
 * Legacy status values (for backward compatibility)
 */
export type LegacyAppRequestStatus =
  | 'pending'                 // Legacy - maps to 'idea'
  | 'planned'                 // Legacy - maps to 'planning'
  | AppRequestStatus;

/**
 * Next action decision types
 * Returned by getNextAction() to indicate what should happen next
 */
export type NextAction =
  | { type: 'run_agent'; agent: string; context?: Record<string, unknown> }
  | { type: 'await_human'; reason: string }
  | { type: 'halt'; reason: string };

/**
 * Conductor state snapshot
 */
export interface ConductorStateSnapshot {
  appRequestId: string;
  currentStatus: string;
  locked: boolean;
  awaitingHuman: boolean;
  lastAgent: string | null;
  canTransition: boolean;
  allowedNextStates: string[];
}

/**
 * Transition validation result
 */
export interface TransitionValidation {
  valid: boolean;
  reason?: string;
  allowedTransitions: string[];
}
