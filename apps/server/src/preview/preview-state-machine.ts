/**
 * PREVIEW STATE MACHINE
 *
 * Enforces allowed state transitions for Preview Runtime sessions.
 *
 * State flow:
 * READY → STARTING → BUILDING → RUNNING → TERMINATED
 *           ↓           ↓          ↓
 *         FAILED      FAILED    FAILED
 *
 * Constitutional constraints:
 * - No backward transitions
 * - FAILED is terminal (no retry)
 * - TERMINATED is terminal (no resume)
 * - All transitions logged
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import type { SessionStatus } from './preview-runtime-types';
import type { Logger } from 'pino';

export const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  READY: ['STARTING', 'FAILED'],
  STARTING: ['BUILDING', 'FAILED'],
  BUILDING: ['RUNNING', 'FAILED'],
  RUNNING: ['TERMINATED', 'FAILED'],
  FAILED: [], // Terminal state
  TERMINATED: [], // Terminal state
};

export class PreviewStateMachine {
  constructor(
    private sessionId: string,
    private logger: Logger
  ) {}

  /**
   * Validate and execute state transition.
   *
   * Throws if transition is illegal.
   */
  transition(from: SessionStatus, to: SessionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from];

    if (!allowed.includes(to)) {
      throw new Error(
        `ILLEGAL TRANSITION: ${from} → ${to}\n` +
          `Allowed transitions from ${from}: ${allowed.join(', ')}\n` +
          `Session: ${this.sessionId}`
      );
    }

    // Log transition for audit trail
    this.logger.info({
      event: 'preview.state_transition',
      sessionId: this.sessionId,
      from,
      to,
      timestamp: Date.now(),
    });
  }

  /**
   * Assert that current status is not terminal.
   * Throws if status is FAILED or TERMINATED.
   */
  assertNotTerminal(status: SessionStatus): void {
    if (status === 'FAILED' || status === 'TERMINATED') {
      throw new Error(
        `Cannot perform operation: session is ${status} (terminal state)\n` +
          `Session: ${this.sessionId}`
      );
    }
  }

  /**
   * Check if a status is terminal.
   */
  isTerminal(status: SessionStatus): boolean {
    return status === 'FAILED' || status === 'TERMINATED';
  }

  /**
   * Get allowed next states from current status.
   */
  getAllowedTransitions(from: SessionStatus): SessionStatus[] {
    return ALLOWED_TRANSITIONS[from];
  }
}
