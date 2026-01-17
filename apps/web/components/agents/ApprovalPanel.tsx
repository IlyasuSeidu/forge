/**
 * Approval Panel Component
 *
 * Reusable approve/reject controls for agent outputs.
 * Handles API calls, loading states, and error display.
 */

'use client';

import { useApproval } from '@/lib/hooks/useApproval';
import { useRouter } from 'next/navigation';

interface ApprovalPanelProps {
  approvalId?: string;
  agentId: string;
  approveText?: string;
  rejectText?: string;
  onApproveSuccess?: () => void;
  onRejectSuccess?: () => void;
  disabled?: boolean;
}

export function ApprovalPanel({
  approvalId,
  agentId,
  approveText = 'Approve & Lock',
  rejectText = 'Reject',
  onApproveSuccess,
  onRejectSuccess,
  disabled = false,
}: ApprovalPanelProps) {
  const { approve, reject, isApproving, isRejecting, error, clearError } = useApproval(approvalId);
  const router = useRouter();

  const handleApprove = async () => {
    const success = await approve();
    if (success) {
      onApproveSuccess?.();
      // Refresh the page data
      router.refresh();
    }
  };

  const handleReject = async () => {
    const success = await reject('User rejected from UI');
    if (success) {
      onRejectSuccess?.();
      // Refresh the page data
      router.refresh();
    }
  };

  const isLoading = isApproving || isRejecting;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to proceed?</h3>
      <p className="text-sm text-gray-600 mb-6">
        Once you approve, this artifact will be hash-locked and immutable. It cannot be changed afterward.
      </p>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-red-900">Approval Failed</div>
              <div className="text-sm text-red-800 mt-1">{error}</div>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-700"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={disabled || isLoading || !approvalId}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            disabled || isLoading || !approvalId
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isApproving ? 'Approving...' : approveText}
        </button>

        <button
          onClick={handleReject}
          disabled={disabled || isLoading || !approvalId}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            disabled || isLoading || !approvalId
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {isRejecting ? 'Rejecting...' : rejectText}
        </button>
      </div>

      {/* No Approval ID Warning */}
      {!approvalId && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-900">
            ℹ️ This agent is not yet awaiting approval. Complete the required steps first.
          </p>
        </div>
      )}
    </div>
  );
}
