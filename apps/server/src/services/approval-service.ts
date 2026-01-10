import type { FastifyBaseLogger } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  ApprovalStatus,
  type Approval,
  type CreateApprovalInput,
  type ResolveApprovalInput,
} from '../models/index.js';
import { BusinessRuleError, NotFoundError } from '../utils/errors.js';

/**
 * ApprovalService handles human-in-the-loop approval logic
 */
export class ApprovalService {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger.child({ service: 'ApprovalService' });
  }

  /**
   * Creates a new approval request
   */
  async createApproval(input: CreateApprovalInput): Promise<Approval> {
    const approval = await prisma.approval.create({
      data: {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        executionId: input.executionId,
        appRequestId: input.appRequestId,
        taskId: input.taskId,
        type: input.type,
        status: ApprovalStatus.Pending,
      },
    });

    this.logger.info(
      {
        approvalId: approval.id,
        projectId: input.projectId,
        executionId: input.executionId,
        appRequestId: input.appRequestId,
        type: input.type,
      },
      'Approval created'
    );

    return approval;
  }

  /**
   * Gets an approval by ID
   */
  async getApprovalById(approvalId: string): Promise<Approval | null> {
    return prisma.approval.findUnique({
      where: { id: approvalId },
    });
  }

  /**
   * Gets all approvals for a project
   */
  async getApprovalsByProjectId(projectId: string): Promise<Approval[]> {
    return prisma.approval.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Gets pending approvals for an execution
   */
  async getPendingApprovalsForExecution(executionId: string): Promise<Approval[]> {
    return prisma.approval.findMany({
      where: {
        executionId,
        status: ApprovalStatus.Pending,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approves an approval request (idempotent)
   */
  async approveApproval(approvalId: string, input?: ResolveApprovalInput): Promise<Approval> {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new NotFoundError('Approval', approvalId);
    }

    // Idempotency: if already approved, return it
    if (approval.status === ApprovalStatus.Approved) {
      this.logger.info({ approvalId }, 'Approval already approved (idempotent)');
      return approval;
    }

    // Cannot approve a rejected approval
    if (approval.status === ApprovalStatus.Rejected) {
      throw new BusinessRuleError(
        `Cannot approve a rejected approval: ${approvalId}`
      );
    }

    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.Approved,
        reason: input?.reason,
        resolvedAt: new Date(),
      },
    });

    this.logger.info(
      {
        approvalId,
        projectId: approval.projectId,
        executionId: approval.executionId,
        type: approval.type,
      },
      'Approval approved'
    );

    return updatedApproval;
  }

  /**
   * Rejects an approval request (idempotent)
   */
  async rejectApproval(approvalId: string, input?: ResolveApprovalInput): Promise<Approval> {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new NotFoundError('Approval', approvalId);
    }

    // Idempotency: if already rejected, return it
    if (approval.status === ApprovalStatus.Rejected) {
      this.logger.info({ approvalId }, 'Approval already rejected (idempotent)');
      return approval;
    }

    // Cannot reject an approved approval
    if (approval.status === ApprovalStatus.Approved) {
      throw new BusinessRuleError(
        `Cannot reject an approved approval: ${approvalId}`
      );
    }

    const updatedApproval = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.Rejected,
        reason: input?.reason,
        resolvedAt: new Date(),
      },
    });

    this.logger.info(
      {
        approvalId,
        projectId: approval.projectId,
        executionId: approval.executionId,
        type: approval.type,
        reason: input?.reason,
      },
      'Approval rejected'
    );

    return updatedApproval;
  }
}
