import type { Approval as PrismaApproval } from '@prisma/client';

/**
 * Approval type represents what is being approved
 */
export enum ApprovalType {
  ExecutionStart = 'execution_start',
  TaskCompletion = 'task_completion',
}

/**
 * Approval status represents the current state of an approval
 */
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Approval represents a request for human approval before proceeding
 * Re-export Prisma type for consistency
 */
export type Approval = PrismaApproval;

/**
 * Input for creating a new approval
 */
export interface CreateApprovalInput {
  projectId: string;
  executionId: string;
  taskId?: string;
  type: ApprovalType;
}

/**
 * Input for resolving an approval
 */
export interface ResolveApprovalInput {
  reason?: string;
}
