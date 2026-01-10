/**
 * Verification represents validation of generated artifacts
 * Status flow: pending -> passed | failed
 */
export interface Verification {
  id: string;
  appRequestId: string;
  executionId: string;
  status: VerificationStatus;
  errors?: string[] | null;
  attempt: number;
  createdAt: Date;
}

export enum VerificationStatus {
  Pending = 'pending',
  Passed = 'passed',
  Failed = 'failed',
}
