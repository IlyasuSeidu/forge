/**
 * Foundry Architect Page (Agent 1)
 *
 * Asks 8 structured questions to understand the user's app.
 * Questions are immutable. Answers are editable until locked.
 *
 * USER FEELING: "Forge is listening, not guessing."
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { HashBadge } from '@/components/agents/HashBadge';
import { useAgentState } from '@/lib/context/AgentStateContext';
import { useApproval } from '@/lib/hooks/useApproval';

// The 8 foundational questions (immutable)
const QUESTIONS = [
  {
    id: 'q1',
    number: 1,
    question: 'What is the primary purpose of your application?',
    placeholder: 'e.g., Help users track their fitness goals',
  },
  {
    id: 'q2',
    number: 2,
    question: 'Who are the main users of this application?',
    placeholder: 'e.g., Fitness enthusiasts, personal trainers',
  },
  {
    id: 'q3',
    number: 3,
    question: 'What is the most important problem you are solving?',
    placeholder: 'e.g., People struggle to stay consistent with workouts',
  },
  {
    id: 'q4',
    number: 4,
    question: 'What are the key features users need?',
    placeholder: 'e.g., Workout logging, progress charts, reminders',
  },
  {
    id: 'q5',
    number: 5,
    question: 'What data will your application store?',
    placeholder: 'e.g., User profiles, workout history, goals',
  },
  {
    id: 'q6',
    number: 6,
    question: 'Do users need accounts and authentication?',
    placeholder: 'e.g., Yes, users need to login to save their data',
  },
  {
    id: 'q7',
    number: 7,
    question: 'Will users interact with each other?',
    placeholder: 'e.g., No, this is a single-user app',
  },
  {
    id: 'q8',
    number: 8,
    question: 'What makes this app different from existing solutions?',
    placeholder: 'e.g., Focuses on habit formation, not just tracking',
  },
];

export default function FoundryArchitectPage() {
  // Get agent state from context
  const { currentState } = useAgentState('foundry-architect');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(currentState?.status === 'approved');
  const [hash, setHash] = useState<string | null>(currentState?.hash || null);

  const allAnswersFilled = QUESTIONS.every((q) => answers[q.id]?.trim().length > 0);

  const handleAnswerChange = (questionId: string, value: string) => {
    if (isLocked) return; // Cannot edit after locking
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleApprove = async () => {
    const success = await approve();

    if (success) {
      setIsLocked(true);
      // Hash will be available from updated agent state after refresh
    }
  };

  const handleReject = async () => {
    const confirmed = confirm('Are you sure you want to clear all answers?');
    if (!confirmed) return;

    await reject('User cleared answers');
    setAnswers({});
  };

  return (
    <div>
      {/* Agent Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🏗️</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Foundry Architect</h1>
            <p className="text-gray-600 mt-1">Answer these 8 questions to define your app</p>
          </div>
        </div>

        {hash && (
          <div className="mt-4">
            <HashBadge hash={hash} size="md" />
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900">How this works</h3>
              <p className="text-sm text-blue-800 mt-1">
                These questions help Forge understand what you want to build. Answer thoughtfully - these form the
                foundation for everything that follows. Once you approve, your answers will be locked and hash-sealed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6 mb-8">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Question Number & Text */}
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                  {q.number}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{q.question}</h3>
              </div>
            </div>

            {/* Answer Field */}
            <div className="ml-12">
              <textarea
                value={answers[q.id] || ''}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder={q.placeholder}
                disabled={isLocked}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  isLocked
                    ? 'bg-gray-50 text-gray-700 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                rows={3}
              />
              {answers[q.id] && (
                <div className="mt-2 text-sm text-gray-600">{answers[q.id].length} characters</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Approval Section */}
      {!isLocked && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to proceed?</h3>
          <p className="text-sm text-gray-600 mb-6">
            Once you approve, these answers will be locked and hash-sealed. They cannot be changed afterward.
          </p>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="font-semibold text-red-900">Approval Failed</div>
                  <div className="text-sm text-red-800 mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          <ApprovalButton
            onApprove={handleApprove}
            onReject={handleReject}
            disabled={!allAnswersFilled || !currentState?.approvalId || isApproving || isRejecting}
            approveText="Lock Answers & Continue"
            rejectText="Clear All"
          />

          {!allAnswersFilled && (
            <p className="text-sm text-amber-600 mt-4">
              Please answer all 8 questions before proceeding.
            </p>
          )}

          {!currentState?.approvalId && allAnswersFilled && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                ℹ️ Complete the required steps before approval is available.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Locked State */}
      {isLocked && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-green-900">Answers locked</h3>
              <p className="text-sm text-green-800 mt-1">
                Your answers have been approved and locked with hash: <code className="font-mono">{hash}</code>.
                The next agent (Synthetic Founder) will use these answers to generate a base prompt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
