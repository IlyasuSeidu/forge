/**
 * Execution status represents the current state of an execution
 */
export enum ExecutionStatus {
  Idle = 'idle',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
}

/**
 * Execution represents a single run of the autonomous agent system
 */
export interface Execution {
  id: string;
  projectId: string;
  status: ExecutionStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/**
 * Input for creating a new execution
 */
export interface CreateExecutionInput {
  projectId: string;
}
