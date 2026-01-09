import type { Execution as PrismaExecution, ExecutionEvent as PrismaExecutionEvent } from '@prisma/client';

/**
 * Execution status represents the current state of an execution
 */
export enum ExecutionStatus {
  Idle = 'idle',
  Running = 'running',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
}

/**
 * Execution represents a single run of the autonomous agent system
 * Re-export Prisma type for consistency
 */
export type Execution = PrismaExecution;

/**
 * ExecutionEvent represents an event that occurred during execution
 * Re-export Prisma type for consistency
 */
export type ExecutionEvent = PrismaExecutionEvent;

/**
 * Input for creating a new execution
 */
export interface CreateExecutionInput {
  projectId: string;
}
