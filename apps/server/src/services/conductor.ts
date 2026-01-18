/**
 * Conductor Service Helper
 *
 * Provides reusable functions for conductor state enforcement.
 * All agents must use these helpers to ensure state machine integrity.
 */

import type { PrismaClient, ConductorState } from '@prisma/client';
import { ForgeConductor } from '../conductor/forge-conductor.js';
import { NotFoundError, BusinessRuleError } from '../utils/errors.js';

/**
 * Verify project exists in database
 * Throws NotFoundError if project not found
 */
export async function assertProjectExists(
  prisma: PrismaClient,
  projectId: string
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }
}

/**
 * Get existing conductor state or create new one
 * Returns conductor state for the project's latest AppRequest
 */
export async function getOrCreateConductorState(
  prisma: PrismaClient,
  conductor: ForgeConductor,
  projectId: string
): Promise<{ conductorState: ConductorState; appRequestId: string }> {
  // Verify project exists
  await assertProjectExists(prisma, projectId);

  // Get latest app request for project
  let appRequest = await prisma.appRequest.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  // Create app request if none exists
  if (!appRequest) {
    appRequest = await prisma.appRequest.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        description: 'Initial app request',
        status: 'pending',
      },
    });
  }

  // Get or create conductor state
  let conductorState = await prisma.conductorState.findUnique({
    where: { appRequestId: appRequest.id },
  });

  if (!conductorState) {
    // Initialize conductor state
    await conductor.initialize(appRequest.id);

    // Fetch the created state
    conductorState = await prisma.conductorState.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!conductorState) {
      throw new Error('Failed to initialize conductor state');
    }
  }

  return {
    conductorState,
    appRequestId: appRequest.id,
  };
}

/**
 * Assert conductor is not locked or paused
 * Throws BusinessRuleError if locked or awaiting human
 */
export async function assertNotLockedOrPaused(state: ConductorState): Promise<void> {
  if (state.locked) {
    throw new BusinessRuleError(
      'Conductor is locked - another agent is currently executing. Please wait.'
    );
  }

  if (state.awaitingHuman) {
    const reason = state.pauseReason || 'Awaiting human input';
    throw new BusinessRuleError(`Conductor is paused: ${reason}`);
  }
}

/**
 * Assert conductor is in expected state
 * Throws BusinessRuleError if state doesn't match
 */
export async function assertStateEquals(
  state: ConductorState,
  expectedState: string
): Promise<void> {
  if (state.currentStatus !== expectedState) {
    throw new BusinessRuleError(
      `Invalid conductor state: expected '${expectedState}', got '${state.currentStatus}'`
    );
  }
}

/**
 * Transition conductor from one state to another
 * Validates transition is allowed and updates state
 */
export async function transitionState(
  conductor: ForgeConductor,
  appRequestId: string,
  fromState: string,
  toState: string,
  agentName: string
): Promise<void> {
  // Get current state snapshot
  const snapshot = await conductor.getStateSnapshot(appRequestId);

  if (!snapshot) {
    throw new NotFoundError(`Conductor state not found for app request ${appRequestId}`);
  }

  // Verify current state matches expected fromState
  if (snapshot.currentStatus !== fromState) {
    throw new BusinessRuleError(
      `Cannot transition from '${fromState}' to '${toState}': ` +
        `conductor is currently in '${snapshot.currentStatus}' state`
    );
  }

  // Perform transition
  await conductor.transition(appRequestId, toState, agentName);
}

/**
 * Get conductor state snapshot
 * Returns null if not found
 */
export async function getConductorSnapshot(
  conductor: ForgeConductor,
  appRequestId: string
) {
  return conductor.getStateSnapshot(appRequestId);
}

/**
 * Lock conductor for agent execution
 */
export async function lockConductor(
  conductor: ForgeConductor,
  appRequestId: string
): Promise<void> {
  await conductor.lock(appRequestId);
}

/**
 * Unlock conductor after agent execution
 */
export async function unlockConductor(
  conductor: ForgeConductor,
  appRequestId: string
): Promise<void> {
  await conductor.unlock(appRequestId);
}

/**
 * Pause conductor for human intervention
 */
export async function pauseForHuman(
  conductor: ForgeConductor,
  appRequestId: string,
  reason: string
): Promise<void> {
  await conductor.pauseForHuman(appRequestId, reason);
}

/**
 * Resume conductor after human intervention
 */
export async function resumeAfterHuman(
  conductor: ForgeConductor,
  appRequestId: string
): Promise<void> {
  await conductor.resumeAfterHuman(appRequestId);
}
