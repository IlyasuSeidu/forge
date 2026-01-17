import crypto from 'node:crypto';
import type { Project, CreateProjectInput } from '../models/index.js';
import { prisma } from '../lib/prisma.js';

/**
 * ProjectService manages project state using Prisma
 */
export class ProjectService {
  /**
   * Creates a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        description: input.description.trim(),
      },
    });

    return project;
  }

  /**
   * Retrieves all projects
   */
  async getAllProjects(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects;
  }

  /**
   * Retrieves a project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    return project;
  }

  /**
   * Checks if a project exists
   */
  async projectExists(id: string): Promise<boolean> {
    const count = await prisma.project.count({
      where: { id },
    });

    return count > 0;
  }

  /**
   * Gets comprehensive project state including all 17 agents' status
   * This is the unified API for frontend to get complete project state
   */
  async getProjectState(projectId: string) {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    // Get latest app request for this project
    const latestAppRequest = await prisma.appRequest.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    const appRequestId = latestAppRequest?.id;

    // Get conductor state (if exists)
    const conductorState = appRequestId
      ? await prisma.conductorState.findUnique({
          where: { appRequestId },
        })
      : null;

    // Query all agent-related tables in parallel
    const [
      foundrySession,
      syntheticAnswer,
      planningDocs,
      screenIndex,
      userJourneys,
      visualExpansion,
      visualNormalization,
      visualComposition,
      visualCodeRendering,
      projectRuleSet,
      buildPrompts,
      executionPlans,
      verificationResults,
      verificationReports,
      repairPlans,
      repairExecutionLogs,
      completionReports,
      previewSessions,
      approvals,
    ] = await Promise.all([
      // Agent 1: Foundry Architect
      appRequestId
        ? prisma.foundrySession.findUnique({
            where: { appRequestId },
          })
        : null,
      // Agent 2: Synthetic Founder
      appRequestId
        ? prisma.syntheticAnswer.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      // Agent 3: Product Strategist
      appRequestId
        ? prisma.planningDocument.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Agent 4: Screen Cartographer
      appRequestId
        ? prisma.screenIndex.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      // Agent 5: Journey Orchestrator
      appRequestId
        ? prisma.userJourney.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Agent 6: VRA
      appRequestId
        ? prisma.visualExpansionContract.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      // Agent 7: DVNL
      appRequestId
        ? prisma.visualNormalizationContract.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      // Agent 8: VCA
      appRequestId
        ? prisma.visualCompositionContract.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      // Agent 9: VCRA
      appRequestId
        ? prisma.visualCodeRenderingContract.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      // Agent 10: Build Prompt Engineer
      appRequestId
        ? prisma.projectRuleSet.findFirst({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : null,
      appRequestId
        ? prisma.buildPrompt.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Agent 11: Execution Planner
      appRequestId
        ? prisma.executionPlan.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Agents 13-14: Verification
      appRequestId
        ? prisma.verificationResult.findMany({
            where: { appRequestId },
            orderBy: { executedAt: 'desc' },
          })
        : [],
      appRequestId
        ? prisma.verificationReport.findMany({
            where: { appRequestId },
            orderBy: { generatedAt: 'desc' },
          })
        : [],
      // Agents 15-16: Repair
      appRequestId
        ? prisma.repairPlan.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      appRequestId
        ? prisma.repairExecutionLog.findMany({
            where: { appRequestId },
            orderBy: { executedAt: 'desc' },
          })
        : [],
      // Agent 17: Completion Auditor
      appRequestId
        ? prisma.completionReport.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // Preview sessions
      appRequestId
        ? prisma.previewRuntimeSession.findMany({
            where: { appRequestId },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      // All approvals for this project
      prisma.approval.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Helper to determine agent status based on artifacts and approvals
    const getAgentStatus = (
      artifactExists: boolean,
      artifactHash: string | null | undefined,
      approvalType?: string
    ): 'pending' | 'awaiting_approval' | 'approved' | 'failed' => {
      if (!artifactExists) return 'pending';
      if (artifactHash) return 'approved'; // Hash-locked = approved

      // Check if there's a pending approval for this agent
      if (approvalType) {
        const approval = approvals.find(
          (a) => a.type === approvalType && a.status === 'pending'
        );
        if (approval) return 'awaiting_approval';

        const approvedApproval = approvals.find(
          (a) => a.type === approvalType && a.status === 'approved'
        );
        if (approvedApproval) return 'approved';

        const rejectedApproval = approvals.find(
          (a) => a.type === approvalType && a.status === 'rejected'
        );
        if (rejectedApproval) return 'failed';
      }

      return 'pending';
    };

    // Build agent states array
    const agentStates = [
      {
        agentId: 'foundry-architect',
        status: getAgentStatus(
          !!foundrySession,
          foundrySession?.basePromptHash
        ),
        artifactHash: foundrySession?.basePromptHash,
        inputHashes: [],
        updatedAt: foundrySession?.createdAt?.toISOString(),
      },
      {
        agentId: 'synthetic-founder',
        status: getAgentStatus(
          !!syntheticAnswer,
          syntheticAnswer?.requestHash,
          'synthetic_answers'
        ),
        artifactHash: syntheticAnswer?.requestHash,
        inputHashes: foundrySession?.basePromptHash
          ? [foundrySession.basePromptHash]
          : [],
        updatedAt: syntheticAnswer?.createdAt?.toISOString(),
      },
      {
        agentId: 'product-strategist',
        status: getAgentStatus(
          planningDocs.length > 0,
          planningDocs[0]?.documentHash,
          'planning_complete'
        ),
        artifactHash: planningDocs[0]?.documentHash,
        inputHashes: syntheticAnswer?.requestHash
          ? [syntheticAnswer.requestHash]
          : [],
        updatedAt: planningDocs[0]?.createdAt?.toISOString(),
      },
      {
        agentId: 'screen-cartographer',
        status: getAgentStatus(
          !!screenIndex,
          screenIndex?.screenIndexHash,
          'screen_index_complete'
        ),
        artifactHash: screenIndex?.screenIndexHash,
        inputHashes: planningDocs[0]?.documentHash
          ? [planningDocs[0].documentHash]
          : [],
        updatedAt: screenIndex?.createdAt?.toISOString(),
      },
      {
        agentId: 'journey-orchestrator',
        status: getAgentStatus(
          userJourneys.length > 0,
          userJourneys[0]?.journeyHash,
          'journeys_complete'
        ),
        artifactHash: userJourneys[0]?.journeyHash,
        inputHashes: screenIndex?.screenIndexHash ? [screenIndex.screenIndexHash] : [],
        updatedAt: userJourneys[0]?.createdAt?.toISOString(),
      },
      {
        agentId: 'vra',
        status: getAgentStatus(
          !!visualExpansion,
          visualExpansion?.contractHash,
          'vra_complete'
        ),
        artifactHash: visualExpansion?.contractHash,
        inputHashes: userJourneys[0]?.journeyHash
          ? [userJourneys[0].journeyHash]
          : [],
        updatedAt: visualExpansion?.createdAt?.toISOString(),
      },
      {
        agentId: 'dvnl',
        status: getAgentStatus(
          !!visualNormalization,
          visualNormalization?.contractHash,
          'dvnl_complete'
        ),
        artifactHash: visualNormalization?.contractHash,
        inputHashes: visualExpansion?.contractHash
          ? [visualExpansion.contractHash]
          : [],
        updatedAt: visualNormalization?.createdAt?.toISOString(),
      },
      {
        agentId: 'vca',
        status: getAgentStatus(
          !!visualComposition,
          visualComposition?.contractHash,
          'vca_complete'
        ),
        artifactHash: visualComposition?.contractHash,
        inputHashes: visualNormalization?.contractHash
          ? [visualNormalization.contractHash]
          : [],
        updatedAt: visualComposition?.createdAt?.toISOString(),
      },
      {
        agentId: 'vcra',
        status: getAgentStatus(
          !!visualCodeRendering,
          visualCodeRendering?.contractHash,
          'vcra_complete'
        ),
        artifactHash: visualCodeRendering?.contractHash,
        inputHashes: visualComposition?.contractHash
          ? [visualComposition.contractHash]
          : [],
        updatedAt: visualCodeRendering?.createdAt?.toISOString(),
      },
      {
        agentId: 'build-prompt-engineer',
        status: getAgentStatus(
          buildPrompts.length > 0,
          buildPrompts[0]?.contractHash,
          'build_prompts_ready'
        ),
        artifactHash: buildPrompts[0]?.contractHash,
        inputHashes: projectRuleSet?.rulesHash
          ? [projectRuleSet.rulesHash]
          : [],
        updatedAt: buildPrompts[0]?.createdAt?.toISOString(),
      },
      {
        agentId: 'execution-planner',
        status: getAgentStatus(
          executionPlans.length > 0,
          executionPlans[0]?.contractHash,
          'execution_plan_ready'
        ),
        artifactHash: executionPlans[0]?.contractHash,
        inputHashes: buildPrompts[0]?.contractHash
          ? [buildPrompts[0].contractHash]
          : [],
        updatedAt: executionPlans[0]?.createdAt?.toISOString(),
      },
      {
        agentId: 'forge-implementer',
        status: latestAppRequest?.status === 'building'
          ? 'in_progress'
          : latestAppRequest?.status === 'completed'
          ? 'approved'
          : 'pending',
        artifactHash: undefined,
        inputHashes: executionPlans[0]?.contractHash
          ? [executionPlans[0].contractHash]
          : [],
        updatedAt: latestAppRequest?.updatedAt?.toISOString(),
      },
      {
        agentId: 'verification-executor',
        status: getAgentStatus(
          verificationResults.length > 0,
          verificationResults[0]?.resultHash,
          'verification_complete'
        ),
        artifactHash: verificationResults[0]?.resultHash,
        inputHashes: [],
        updatedAt: verificationResults[0]?.executedAt?.toISOString(),
      },
      {
        agentId: 'verification-report-generator',
        status: getAgentStatus(
          verificationReports.length > 0,
          verificationReports[0]?.reportHash,
          'verification_report_ready'
        ),
        artifactHash: verificationReports[0]?.reportHash,
        inputHashes: verificationResults[0]?.resultHash
          ? [verificationResults[0].resultHash]
          : [],
        updatedAt: verificationReports[0]?.generatedAt?.toISOString(),
      },
      {
        agentId: 'repair-plan-generator',
        status: getAgentStatus(
          repairPlans.length > 0,
          repairPlans[0]?.repairPlanHash,
          'repair_plan_approved'
        ),
        artifactHash: repairPlans[0]?.repairPlanHash,
        inputHashes: verificationReports[0]?.reportHash
          ? [verificationReports[0].reportHash]
          : [],
        updatedAt: repairPlans[0]?.createdAt?.toISOString(),
      },
      {
        agentId: 'repair-agent',
        status: getAgentStatus(
          repairExecutionLogs.length > 0,
          repairExecutionLogs[0]?.executionLogHash,
          'repair_complete'
        ),
        artifactHash: repairExecutionLogs[0]?.executionLogHash,
        inputHashes: repairPlans[0]?.repairPlanHash
          ? [repairPlans[0].repairPlanHash]
          : [],
        updatedAt: repairExecutionLogs[0]?.executedAt?.toISOString(),
      },
      {
        agentId: 'completion-auditor',
        status: getAgentStatus(
          completionReports.length > 0,
          completionReports[0]?.reportHash,
          'completion_report_ready'
        ),
        artifactHash: completionReports[0]?.reportHash,
        inputHashes: [],
        updatedAt: completionReports[0]?.createdAt?.toISOString(),
      },
    ];

    // Determine preview/download availability
    const completionReport = completionReports[0];
    const isComplete = completionReport?.verdict === 'COMPLETE';

    const activePreviewSession = previewSessions.find(
      (s) => s.status === 'running' || s.status === 'ready'
    );

    return {
      project,
      conductorState: conductorState
        ? {
            state: conductorState.currentStatus,
            updatedAt: conductorState.updatedAt?.toISOString(),
          }
        : null,
      latestAppRequest: latestAppRequest
        ? {
            id: latestAppRequest.id,
            status: latestAppRequest.status,
            prompt: latestAppRequest.prompt,
            createdAt: latestAppRequest.createdAt.toISOString(),
          }
        : null,
      agentStates,
      capabilities: {
        canPreview: isComplete,
        canDownload: isComplete,
        hasActivePreview: !!activePreviewSession,
        previewUrl: activePreviewSession?.previewUrl || null,
      },
    };
  }
}
