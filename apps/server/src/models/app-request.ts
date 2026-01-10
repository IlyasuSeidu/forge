/**
 * AppRequest represents a high-level request to build an entire app
 * Status flow: pending -> planned -> building -> completed | failed
 */
export interface AppRequest {
  id: string;
  projectId: string;
  prompt: string;
  status: AppRequestStatus;
  prdPath?: string | null;
  executionId?: string | null;
  errorReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum AppRequestStatus {
  Pending = 'pending',
  Planned = 'planned',
  Building = 'building',
  Completed = 'completed',
  Failed = 'failed',
}
