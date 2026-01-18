/**
 * Foundry Architect Routes (Agent 1)
 *
 * PRODUCTION WIRING - Full conductor integration
 *
 * Endpoints:
 * - GET    /api/projects/:projectId/foundry-architect
 * - POST   /api/projects/:projectId/foundry-architect/start
 * - POST   /api/projects/:projectId/foundry-architect/submit
 * - POST   /api/projects/:projectId/foundry-architect/approve
 * - POST   /api/projects/:projectId/foundry-architect/reject
 */

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import type { ForgeConductor } from '../conductor/index.js';
import { NotFoundError, ValidationError, BusinessRuleError } from '../utils/errors.js';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

// The 8 immutable foundational questions
const FOUNDRY_QUESTIONS = [
  {
    id: 'q1',
    question: 'What is the primary purpose of your application?',
  },
  {
    id: 'q2',
    question: 'Who are the main users of this application?',
  },
  {
    id: 'q3',
    question: 'What is the most important problem you are solving?',
  },
  {
    id: 'q4',
    question: 'What are the key features users need?',
  },
  {
    id: 'q5',
    question: 'What data will your application store?',
  },
  {
    id: 'q6',
    question: 'Do users need accounts and authentication?',
  },
  {
    id: 'q7',
    question: 'Will users interact with each other?',
  },
  {
    id: 'q8',
    question: 'What makes this app different from existing solutions?',
  },
];

interface AnswersContract {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
}

/**
 * Compute deterministic SHA-256 hash of answers
 * Excludes timestamps and IDs for determinism
 */
function computeContractHash(answers: AnswersContract): string {
  const normalized = {
    q1: answers.q1.trim(),
    q2: answers.q2.trim(),
    q3: answers.q3.trim(),
    q4: answers.q4.trim(),
    q5: answers.q5.trim(),
    q6: answers.q6.trim(),
    q7: answers.q7.trim(),
    q8: answers.q8.trim(),
  };

  const canonical = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Validate answers contract
 */
function validateAnswers(answers: unknown): AnswersContract {
  if (!answers || typeof answers !== 'object') {
    throw new ValidationError('Answers must be an object');
  }

  const contract = answers as Record<string, unknown>;

  for (let i = 1; i <= 8; i++) {
    const key = `q${i}`;
    const answer = contract[key];

    if (typeof answer !== 'string') {
      throw new ValidationError(`Answer for ${key} must be a string`);
    }

    if (answer.trim().length === 0) {
      throw new ValidationError(`Answer for ${key} cannot be empty`);
    }

    if (answer.trim().length > 5000) {
      throw new ValidationError(`Answer for ${key} exceeds maximum length of 5000 characters`);
    }
  }

  return contract as unknown as AnswersContract;
}

export async function foundryArchitectRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  conductor: ForgeConductor,
  logger: Logger
) {
  /**
   * GET /api/projects/:projectId/foundry-architect
   *
   * Returns current state of Agent 1 including:
   * - Conductor state snapshot
   * - Foundry artifact (if exists)
   * - Computed UI state (pending | awaiting_approval | approved)
   */
  fastify.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/foundry-architect', async (request) => {
    const { projectId } = request.params;

    logger.info({ projectId }, 'Fetching Foundry Architect state');

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Get latest app request
    const appRequest = await prisma.appRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!appRequest) {
      // No app request yet - agent is pending
      return {
        conductorState: null,
        artifact: null,
        uiState: 'pending' as const,
        questions: FOUNDRY_QUESTIONS,
      };
    }

    // Get conductor state
    const conductorState = await prisma.conductorState.findUnique({
      where: { appRequestId: appRequest.id },
    });

    // Get foundry session
    const foundrySession = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    // Derive UI state
    let uiState: 'pending' | 'awaiting_approval' | 'approved' = 'pending';
    if (foundrySession) {
      if (foundrySession.basePromptHash) {
        uiState = 'approved';
      } else if (foundrySession.status === 'awaiting_approval') {
        uiState = 'awaiting_approval';
      }
    }

    return {
      conductorState: conductorState
        ? {
            currentStatus: conductorState.currentStatus,
            locked: conductorState.locked,
            awaitingHuman: conductorState.awaitingHuman,
            pauseReason: conductorState.pauseReason,
            failureReason: conductorState.failureReason,
            updatedAt: conductorState.updatedAt.toISOString(),
          }
        : null,
      artifact: foundrySession
        ? {
            id: foundrySession.id,
            status: foundrySession.status,
            currentStep: foundrySession.currentStep,
            answers: foundrySession.answers ? JSON.parse(foundrySession.answers) : null,
            basePromptHash: foundrySession.basePromptHash,
            approvedBy: foundrySession.approvedBy,
            approvedAt: foundrySession.approvedAt?.toISOString(),
            createdAt: foundrySession.createdAt.toISOString(),
            updatedAt: foundrySession.updatedAt.toISOString(),
          }
        : null,
      uiState,
      questions: FOUNDRY_QUESTIONS,
    };
  });

  /**
   * POST /api/projects/:projectId/foundry-architect/start
   *
   * Creates initial foundry session if not exists
   * Enforces conductor state allows starting Agent 1
   */
  fastify.post<{
    Params: { projectId: string };
  }>('/projects/:projectId/foundry-architect/start', async (request, reply) => {
    const { projectId } = request.params;

    logger.info({ projectId }, 'Starting Foundry Architect');

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Get or create app request
    let appRequest = await prisma.appRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!appRequest) {
      // Create first app request
      appRequest = await prisma.appRequest.create({
        data: {
          id: randomUUID(),
          projectId,
          prompt: project.description, // Use project description as initial prompt
          status: 'pending',
        },
      });

      logger.info({ appRequestId: appRequest.id }, 'Created new AppRequest');
    }

    // Initialize conductor state if not exists
    let conductorState = await prisma.conductorState.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!conductorState) {
      // Initialize conductor (creates state in DB)
      await conductor.initialize(appRequest.id);
      logger.info({ appRequestId: appRequest.id }, 'Initialized conductor state');

      // Refetch to get full Prisma model
      conductorState = await prisma.conductorState.findUnique({
        where: { appRequestId: appRequest.id },
      });

      if (!conductorState) {
        throw new Error('Failed to initialize conductor state');
      }
    }

    // Validate conductor allows Agent 1 to start
    if (conductorState.currentStatus !== 'idea') {
      throw new BusinessRuleError(
        `Cannot start Foundry Architect: conductor is in '${conductorState.currentStatus}' state, expected 'idea'`
      );
    }

    if (conductorState.locked) {
      throw new BusinessRuleError(
        'Cannot start Foundry Architect: conductor is locked (another agent is running)'
      );
    }

    if (conductorState.awaitingHuman) {
      throw new BusinessRuleError(
        'Cannot start Foundry Architect: conductor is paused awaiting human input'
      );
    }

    // Check if session already exists
    const existingSession = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (existingSession) {
      logger.info({ sessionId: existingSession.id }, 'Foundry session already exists');
      reply.code(200); // Not 201 since not newly created
      return {
        success: true,
        session: {
          id: existingSession.id,
          status: existingSession.status,
          currentStep: existingSession.currentStep,
          createdAt: existingSession.createdAt.toISOString(),
        },
        message: 'Foundry session already exists',
      };
    }

    // Create new foundry session
    const session = await prisma.foundrySession.create({
      data: {
        id: randomUUID(),
        appRequestId: appRequest.id,
        status: 'asking',
        currentStep: 0,
        answers: JSON.stringify({}), // Empty answers initially
      },
    });

    logger.info({ sessionId: session.id, appRequestId: appRequest.id }, 'Created Foundry session');

    reply.code(201);
    return {
      success: true,
      session: {
        id: session.id,
        status: session.status,
        currentStep: session.currentStep,
        createdAt: session.createdAt.toISOString(),
      },
      questions: FOUNDRY_QUESTIONS,
    };
  });

  /**
   * POST /api/projects/:projectId/foundry-architect/submit
   *
   * Submits answers for the 8 foundational questions
   * Validates all fields, stores as contract, computes hash
   * Sets status to awaiting_approval
   */
  fastify.post<{
    Params: { projectId: string };
    Body: { answers: unknown };
  }>('/projects/:projectId/foundry-architect/submit', async (request) => {
    const { projectId } = request.params;
    const { answers } = request.body;

    logger.info({ projectId }, 'Submitting Foundry Architect answers');

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Get app request
    const appRequest = await prisma.appRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!appRequest) {
      throw new BusinessRuleError('No AppRequest found. Call /start first.');
    }

    // Get foundry session
    const session = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!session) {
      throw new BusinessRuleError('No Foundry session found. Call /start first.');
    }

    if (session.basePromptHash) {
      throw new BusinessRuleError('Answers are already approved and hash-locked. Cannot modify.');
    }

    // Validate answers
    const validatedAnswers = validateAnswers(answers);

    // Compute contract hash (excluding timestamps/IDs for determinism)
    const contractHash = computeContractHash(validatedAnswers);

    // Update session with answers
    const updatedSession = await prisma.foundrySession.update({
      where: { id: session.id },
      data: {
        answers: JSON.stringify(validatedAnswers),
        status: 'awaiting_approval',
        currentStep: 8, // All 8 questions answered
        updatedAt: new Date(),
      },
    });

    logger.info(
      {
        sessionId: session.id,
        contractHash: contractHash.substring(0, 16) + '...',
      },
      'Foundry answers submitted'
    );

    return {
      success: true,
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        currentStep: updatedSession.currentStep,
        contractHash, // Preview of hash (not locked yet)
        updatedAt: updatedSession.updatedAt.toISOString(),
      },
    };
  });

  /**
   * POST /api/projects/:projectId/foundry-architect/approve
   *
   * Approves the foundry answers:
   * - Computes and locks hash
   * - Sets status to approved
   * - Transitions conductor from 'idea' -> 'base_prompt_ready'
   * - Unlocks conductor for next agent
   */
  fastify.post<{
    Params: { projectId: string };
    Body: { approvedBy: string };
  }>('/projects/:projectId/foundry-architect/approve', async (request) => {
    const { projectId } = request.params;
    const { approvedBy } = request.body;

    logger.info({ projectId, approvedBy }, 'Approving Foundry Architect');

    if (!approvedBy || typeof approvedBy !== 'string' || approvedBy.trim().length === 0) {
      throw new ValidationError('approvedBy is required');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Get app request
    const appRequest = await prisma.appRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!appRequest) {
      throw new BusinessRuleError('No AppRequest found');
    }

    // Get foundry session
    const session = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!session) {
      throw new BusinessRuleError('No Foundry session found');
    }

    if (session.status !== 'awaiting_approval') {
      throw new BusinessRuleError(
        `Cannot approve: session status is '${session.status}', expected 'awaiting_approval'`
      );
    }

    if (session.basePromptHash) {
      throw new BusinessRuleError('Answers are already approved and hash-locked');
    }

    if (!session.answers) {
      throw new BusinessRuleError('No answers to approve. Call /submit first.');
    }

    // Validate stored answers
    const answers = JSON.parse(session.answers);
    const validatedAnswers = validateAnswers(answers);

    // Compute final hash
    const contractHash = computeContractHash(validatedAnswers);

    // Hash-lock the session
    const approvedSession = await prisma.foundrySession.update({
      where: { id: session.id },
      data: {
        status: 'approved',
        basePromptHash: contractHash,
        approvedBy: approvedBy.trim(),
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info(
      {
        sessionId: session.id,
        contractHash: contractHash.substring(0, 16) + '...',
        approvedBy,
      },
      'Foundry session approved and hash-locked'
    );

    // Transition conductor state: 'idea' -> 'base_prompt_ready'
    await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');

    logger.info(
      { appRequestId: appRequest.id },
      'Conductor transitioned to base_prompt_ready'
    );

    return {
      success: true,
      session: {
        id: approvedSession.id,
        status: approvedSession.status,
        basePromptHash: approvedSession.basePromptHash,
        approvedBy: approvedSession.approvedBy,
        approvedAt: approvedSession.approvedAt?.toISOString(),
      },
      message: 'Foundry Architect approved. Agent 2 (Synthetic Founder) can now proceed.',
    };
  });

  /**
   * POST /api/projects/:projectId/foundry-architect/reject
   *
   * Rejects the foundry answers:
   * - Sets status to rejected
   * - Pauses conductor with reason
   * - No auto-regeneration
   */
  fastify.post<{
    Params: { projectId: string };
    Body: { reason: string };
  }>('/projects/:projectId/foundry-architect/reject', async (request) => {
    const { projectId } = request.params;
    const { reason } = request.body;

    logger.info({ projectId, reason }, 'Rejecting Foundry Architect');

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new ValidationError('Rejection reason is required');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Get app request
    const appRequest = await prisma.appRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!appRequest) {
      throw new BusinessRuleError('No AppRequest found');
    }

    // Get foundry session
    const session = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!session) {
      throw new BusinessRuleError('No Foundry session found');
    }

    if (session.basePromptHash) {
      throw new BusinessRuleError(
        'Cannot reject: answers are already approved and hash-locked'
      );
    }

    // Reset session to asking state (clear answers)
    const rejectedSession = await prisma.foundrySession.update({
      where: { id: session.id },
      data: {
        status: 'asking',
        currentStep: 0,
        answers: JSON.stringify({}),
        updatedAt: new Date(),
      },
    });

    logger.info({ sessionId: session.id, reason }, 'Foundry session rejected and reset');

    // Pause conductor with reason
    await conductor.pauseForHuman(
      appRequest.id,
      `foundry_architect_rejected: ${reason.trim()}`
    );

    logger.info({ appRequestId: appRequest.id }, 'Conductor paused due to rejection');

    return {
      success: true,
      session: {
        id: rejectedSession.id,
        status: rejectedSession.status,
        currentStep: rejectedSession.currentStep,
      },
      message: 'Foundry Architect rejected. Answers cleared. User can re-submit.',
    };
  });
}
