/**
 * Agent States Route
 *
 * Returns the current status of all agents for a project.
 * This is the single source of truth for frontend timeline/progress displays.
 */

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'pino';
import { NotFoundError } from '../utils/errors.js';

export async function agentStatesRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient,
  logger: Logger
) {
  /**
   * GET /projects/:projectId/agent-states
   * Returns status and hash for all agents in the workflow
   */
  fastify.get<{
    Params: { projectId: string };
  }>('/projects/:projectId/agent-states', async (request) => {
    const { projectId } = request.params;

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

    // If no app request exists, all agents are pending
    if (!appRequest) {
      return {
        agents: [
          { id: 'foundry-architect', name: 'Foundry Architect', status: 'pending', hash: null },
          { id: 'synthetic-founder', name: 'Synthetic Founder', status: 'pending', hash: null },
          { id: 'product-strategist', name: 'Product Strategist', status: 'pending', hash: null },
          { id: 'journey-orchestrator', name: 'Journey Orchestrator', status: 'pending', hash: null },
          { id: 'screen-cartographer', name: 'Screen Cartographer', status: 'pending', hash: null },
          { id: 'vra', name: 'VRA', status: 'pending', hash: null },
          { id: 'dvnl', name: 'DVNL', status: 'pending', hash: null },
          { id: 'vca', name: 'VCA', status: 'pending', hash: null },
          { id: 'vcra', name: 'VCRA', status: 'pending', hash: null },
          { id: 'build-prompt-engineer', name: 'Build Prompt Engineer', status: 'pending', hash: null },
          { id: 'execution-planner', name: 'Execution Planner', status: 'pending', hash: null },
          { id: 'forge-implementer', name: 'Forge Implementer', status: 'pending', hash: null },
          { id: 'verification-executor', name: 'Verification Executor', status: 'pending', hash: null },
          { id: 'verification-report-generator', name: 'Verification Report Generator', status: 'pending', hash: null },
          { id: 'repair-plan-generator', name: 'Repair Plan Generator', status: 'pending', hash: null },
          { id: 'repair-agent', name: 'Repair Agent', status: 'pending', hash: null },
          { id: 'completion-auditor', name: 'Completion Auditor', status: 'pending', hash: null },
        ],
      };
    }

    // Get Agent 1 (Foundry Architect) status
    const foundrySession = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    const agent1Status = foundrySession
      ? foundrySession.status === 'approved'
        ? 'approved'
        : foundrySession.status === 'awaiting_approval'
        ? 'awaiting_approval'
        : 'in_progress'
      : 'pending';

    const agent1Hash = foundrySession?.basePromptHash || null;

    // Determine Agent 2 status (can only be "your_turn" if Agent 1 is approved)
    const agent2Status = agent1Status === 'approved' ? 'your_turn' : 'pending';

    logger.info(
      {
        projectId,
        appRequestId: appRequest.id,
        agent1Status,
        agent1Hash,
        agent2Status,
      },
      'Agent states retrieved'
    );

    return {
      agents: [
        {
          id: 'foundry-architect',
          name: 'Foundry Architect',
          status: agent1Status,
          hash: agent1Hash,
          approvedBy: foundrySession?.approvedBy || null,
          approvedAt: foundrySession?.approvedAt?.toISOString() || null,
        },
        {
          id: 'synthetic-founder',
          name: 'Synthetic Founder',
          status: agent2Status,
          hash: null,
        },
        { id: 'product-strategist', name: 'Product Strategist', status: 'pending', hash: null },
        { id: 'journey-orchestrator', name: 'Journey Orchestrator', status: 'pending', hash: null },
        { id: 'screen-cartographer', name: 'Screen Cartographer', status: 'pending', hash: null },
        { id: 'vra', name: 'VRA', status: 'pending', hash: null },
        { id: 'dvnl', name: 'DVNL', status: 'pending', hash: null },
        { id: 'vca', name: 'VCA', status: 'pending', hash: null },
        { id: 'vcra', name: 'VCRA', status: 'pending', hash: null },
        { id: 'build-prompt-engineer', name: 'Build Prompt Engineer', status: 'pending', hash: null },
        { id: 'execution-planner', name: 'Execution Planner', status: 'pending', hash: null },
        { id: 'forge-implementer', name: 'Forge Implementer', status: 'pending', hash: null },
        { id: 'verification-executor', name: 'Verification Executor', status: 'pending', hash: null },
        { id: 'verification-report-generator', name: 'Verification Report Generator', status: 'pending', hash: null },
        { id: 'repair-plan-generator', name: 'Repair Plan Generator', status: 'pending', hash: null },
        { id: 'repair-agent', name: 'Repair Agent', status: 'pending', hash: null },
        { id: 'completion-auditor', name: 'Completion Auditor', status: 'pending', hash: null },
      ],
    };
  });
}
