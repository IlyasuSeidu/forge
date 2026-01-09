import type { FastifyInstance } from 'fastify';
import type { ProjectService, ApprovalService, ExecutionService } from '../services/index.js';
import { NotFoundError } from '../utils/errors.js';
import { ApprovalType } from '../models/index.js';

/**
 * Approval routes
 */
export async function approvalRoutes(
  fastify: FastifyInstance,
  projectService: ProjectService,
  approvalService: ApprovalService,
  executionService: ExecutionService
) {
  /**
   * GET /projects/:id/approvals
   * Lists all approvals for a project
   */
  fastify.get<{ Params: { id: string } }>(
    '/projects/:id/approvals',
    async (request) => {
      const projectId = request.params.id;

      // Verify project exists
      if (!(await projectService.projectExists(projectId))) {
        throw new NotFoundError('Project', projectId);
      }

      const approvals = await approvalService.getApprovalsByProjectId(projectId);

      return { approvals };
    }
  );

  /**
   * POST /approvals/:approvalId/approve
   * Approves an approval and triggers appropriate action
   */
  fastify.post<{
    Params: { approvalId: string };
    Body: { reason?: string };
  }>('/approvals/:approvalId/approve', async (request, reply) => {
    const { approvalId } = request.params;
    const { reason } = request.body ?? {};

    // Get approval to verify it exists
    const approval = await approvalService.getApprovalById(approvalId);

    if (!approval) {
      throw new NotFoundError('Approval', approvalId);
    }

    // Approve the approval (idempotent)
    const approvedApproval = await approvalService.approveApproval(approvalId, {
      reason,
    });

    fastify.log.info(
      { approvalId, type: approval.type, executionId: approval.executionId },
      'Approval approved'
    );

    // Trigger appropriate action based on approval type
    if (approval.type === ApprovalType.ExecutionStart) {
      await executionService.handleExecutionApproval(approval.executionId);
    }
    // Future: handle TaskCompletion approval type when implemented

    return approvedApproval;
  });

  /**
   * POST /approvals/:approvalId/reject
   * Rejects an approval and triggers appropriate action
   */
  fastify.post<{
    Params: { approvalId: string };
    Body: { reason?: string };
  }>('/approvals/:approvalId/reject', async (request, reply) => {
    const { approvalId } = request.params;
    const { reason } = request.body ?? {};

    // Get approval to verify it exists
    const approval = await approvalService.getApprovalById(approvalId);

    if (!approval) {
      throw new NotFoundError('Approval', approvalId);
    }

    // Reject the approval (idempotent)
    const rejectedApproval = await approvalService.rejectApproval(approvalId, {
      reason,
    });

    fastify.log.info(
      { approvalId, type: approval.type, executionId: approval.executionId, reason },
      'Approval rejected'
    );

    // Trigger appropriate action based on approval type
    if (approval.type === ApprovalType.ExecutionStart) {
      await executionService.handleExecutionRejection(approval.executionId, reason);
    }
    // Future: handle TaskCompletion approval type when implemented

    return rejectedApproval;
  });
}
