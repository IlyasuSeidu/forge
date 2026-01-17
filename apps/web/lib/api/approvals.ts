/**
 * Approvals API Client
 *
 * Handles approve/reject operations for agent outputs.
 * Connects frontend buttons to backend approval endpoints.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface ApprovalResponse {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  projectId?: string;
  appRequestId?: string;
  executionId?: string;
  approvedAt?: string;
  rejectedAt?: string;
  reason?: string;
}

/**
 * Approve an agent's output
 */
export async function approveAgent(approvalId: string, reason?: string): Promise<ApprovalResponse> {
  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Approval failed' }));
    throw new Error(error.error || `Failed to approve: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Reject an agent's output
 */
export async function rejectAgent(approvalId: string, reason?: string): Promise<ApprovalResponse> {
  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Rejection failed' }));
    throw new Error(error.error || `Failed to reject: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all approvals for a project
 */
export async function getProjectApprovals(projectId: string): Promise<ApprovalResponse[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/approvals`);

  if (!response.ok) {
    throw new Error(`Failed to fetch approvals: ${response.statusText}`);
  }

  const data = await response.json();
  return data.approvals || [];
}
