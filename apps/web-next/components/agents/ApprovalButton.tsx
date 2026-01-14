/**
 * Approval Button Component
 *
 * Approve/Reject buttons for agent outputs.
 * This is where humans make explicit decisions.
 */

'use client';

import { useState } from 'react';

interface ApprovalButtonProps {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  disabled?: boolean;
  approveText?: string;
  rejectText?: string;
}

export function ApprovalButton({
  onApprove,
  onReject,
  disabled = false,
  approveText = 'Approve & Lock',
  rejectText = 'Reject',
}: ApprovalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setAction('approve');
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    setAction('reject');
    setLoading(true);
    try {
      await onReject();
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleApprove}
        disabled={disabled || loading}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {action === 'approve' && loading ? (
          <>
            <Spinner />
            Approving...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {approveText}
          </>
        )}
      </button>

      <button
        onClick={handleReject}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {action === 'reject' && loading ? (
          <>
            <Spinner />
            Rejecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {rejectText}
          </>
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
