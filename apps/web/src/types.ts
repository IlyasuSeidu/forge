// Domain models matching the backend API

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
  executionId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Execution {
  id: string;
  projectId: string;
  status: 'idle' | 'pending_approval' | 'running' | 'paused' | 'completed' | 'failed';
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ExecutionEvent {
  id: string;
  executionId: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface Artifact {
  id: string;
  projectId: string;
  executionId: string | null;
  taskId: string | null;
  path: string;
  type: 'file' | 'directory';
  createdAt: string;
}

export interface Approval {
  id: string;
  projectId: string;
  executionId: string;
  taskId: string | null;
  type: 'execution_start' | 'task_completion';
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
