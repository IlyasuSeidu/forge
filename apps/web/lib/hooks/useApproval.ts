/**
 * useApproval Hook
 *
 * Manages approval/rejection state for agent outputs.
 * Provides approve/reject functions with loading/error handling.
 */

'use client';

import { useState } from 'react';
import { approveAgent, rejectAgent } from '../api/approvals';

export interface UseApprovalResult {
  approve: (reason?: string) => Promise<boolean>;
  reject: (reason?: string) => Promise<boolean>;
  isApproving: boolean;
  isRejecting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useApproval(approvalId: string | undefined): UseApprovalResult {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async (reason?: string): Promise<boolean> => {
    if (!approvalId) {
      setError('No approval ID available');
      return false;
    }

    setIsApproving(true);
    setError(null);

    try {
      await approveAgent(approvalId, reason);
      setIsApproving(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      setError(message);
      setIsApproving(false);
      return false;
    }
  };

  const reject = async (reason?: string): Promise<boolean> => {
    if (!approvalId) {
      setError('No approval ID available');
      return false;
    }

    setIsRejecting(true);
    setError(null);

    try {
      await rejectAgent(approvalId, reason);
      setIsRejecting(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      setError(message);
      setIsRejecting(false);
      return false;
    }
  };

  const clearError = () => setError(null);

  return {
    approve,
    reject,
    isApproving,
    isRejecting,
    error,
    clearError,
  };
}
