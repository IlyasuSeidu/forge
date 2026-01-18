/**
 * Foundry Architect Page (Agent 1) - PRODUCTION
 *
 * Asks 8 structured questions to understand the user's app.
 * Questions are immutable. Answers are editable until locked.
 *
 * USER FEELING: "Forge is listening, not guessing."
 */

'use client';

import { useState, useEffect } from 'react';
import { HashBadge } from '@/components/agents/HashBadge';
import { useAgentState } from '@/lib/context/AgentStateContext';
import {
  getFoundryArchitectState,
  startFoundryArchitect,
  submitFoundryAnswers,
  approveFoundryAnswers,
  rejectFoundryAnswers,
  type FoundryArchitectState,
} from '@/lib/api/agents';

export default function FoundryArchitectPage() {
  // Get projectId from context
  const { projectId } = useAgentState();

  // Backend state
  const [state, setState] = useState<FoundryArchitectState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Derived state
  const isLocked = state?.artifact.status === 'approved';
  const hash = state?.artifact.basePromptHash;
  const questions = state?.questions || [];
  const allAnswersFilled = questions.every((q) => answers[q.id]?.trim().length > 0);

  // Load state from backend on mount
  useEffect(() => {
    loadState();
  }, [projectId]);

  async function loadState() {
    try {
      setIsLoading(true);
      setError(null);

      // Get current state
      const currentState = await getFoundryArchitectState(projectId);
      setState(currentState);

      // Load existing answers if any
      if (currentState.artifact.answers) {
        setAnswers(currentState.artifact.answers);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load state';
      setError(message);
      console.error('Failed to load Foundry Architect state:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Start agent session (called by button click)
  async function handleStartAgent() {
    try {
      setIsLoading(true);
      setError(null);

      await startFoundryArchitect(projectId);

      // Reload state after starting
      await loadState();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start agent';
      setError(message);
      console.error('Failed to start Foundry Architect:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Autosave answers to backend (debounced in production)
  async function saveAnswers(updatedAnswers: Record<string, string>) {
    if (isLocked) return;

    try {
      setIsSaving(true);
      setSaveStatus('Saving...');

      await submitFoundryAnswers(projectId, updatedAnswers);

      setSaveStatus('Saved');

      // Reload state to get updated status
      const updatedState = await getFoundryArchitectState(projectId);
      setState(updatedState);

      // Clear save status after 2 seconds
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save answers';
      setError(message);
      setSaveStatus('Failed to save');
      console.error('Failed to save answers:', err);
    } finally {
      setIsSaving(false);
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    if (isLocked) return;

    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);

    // Autosave after typing stops (simple implementation - in production use debounce)
    saveAnswers(updatedAnswers);
  };

  const handleApprove = async () => {
    if (!allAnswersFilled || isLocked) return;

    const confirmed = confirm(
      'Once you approve, these answers will be permanently locked and hash-sealed. Continue?'
    );
    if (!confirmed) return;

    try {
      setIsApproving(true);
      setError(null);

      await approveFoundryAnswers(projectId, 'human');

      // Reload state to get hash
      const updatedState = await getFoundryArchitectState(projectId);
      setState(updatedState);

      alert('✅ Answers approved and locked! Agent 2 (Synthetic Founder) can now proceed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve answers';
      setError(message);
      console.error('Failed to approve:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    const confirmed = confirm('Are you sure you want to clear all answers and start over?');
    if (!confirmed) return;

    try {
      setIsRejecting(true);
      setError(null);

      await rejectFoundryAnswers(projectId, 'User requested reset');

      // Clear local answers
      setAnswers({});

      // Reload state
      const updatedState = await getFoundryArchitectState(projectId);
      setState(updatedState);

      alert('Answers cleared. You can now start over.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject answers';
      setError(message);
      console.error('Failed to reject:', err);
    } finally {
      setIsRejecting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading Foundry Architect...</p>
        </div>
      </div>
    );
  }

  // Error state (fatal)
  if (error && !state) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900">Failed to load</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <button
              onClick={loadState}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Agent Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🏗️</span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Foundry Architect</h1>
            <p className="text-gray-600 mt-1">Answer these 8 questions to define your app</p>
          </div>

          {/* Save Status Indicator */}
          {saveStatus && !isLocked && (
            <div className="text-sm text-gray-600">
              {isSaving && (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></span>
                  Saving...
                </span>
              )}
              {!isSaving && saveStatus === 'Saved' && (
                <span className="text-green-600">✓ Saved</span>
              )}
              {!isSaving && saveStatus === 'Failed to save' && (
                <span className="text-red-600">✗ Failed</span>
              )}
            </div>
          )}
        </div>

        {hash && (
          <div className="mt-4">
            <HashBadge hash={hash} size="md" />
          </div>
        )}

        {/* Conductor State Info */}
        {state?.conductorState.awaitingHuman && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-amber-900">Conductor Paused</div>
                <div className="text-amber-800 mt-1">
                  {state.conductorState.pauseReason || 'Awaiting human input'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Agent Button (when no contract exists) */}
      {state?.artifact.status === 'pending' && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to begin?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Start the Foundry Architect to answer 8 structured questions about your application.
              These questions form the foundation for everything that follows.
            </p>
            <button
              onClick={handleStartAgent}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Starting...' : 'Start Agent'}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isLocked && state?.artifact.status !== 'pending' && (
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
                foundation for everything that follows. Your answers autosave as you type. Once you approve, they will be locked and hash-sealed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      {state?.artifact.status !== 'pending' && (
        <div className="space-y-6 mb-8">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Question Number & Text */}
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                  {index + 1}
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
                placeholder="Type your answer here..."
                disabled={isLocked || isSaving}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  isLocked
                    ? 'bg-gray-50 text-gray-700 cursor-not-allowed'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
                rows={3}
              />
              {answers[q.id] && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{answers[q.id].length} characters</span>
                  {answers[q.id].length > 5000 && (
                    <span className="text-red-600">⚠️ Maximum 5000 characters</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Approval Section */}
      {!isLocked && state?.uiState === 'awaiting_approval' && (
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
                  <div className="font-semibold text-red-900">Error</div>
                  <div className="text-sm text-red-800 mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleApprove}
              disabled={!allAnswersFilled || isApproving || isRejecting || isSaving}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                !allAnswersFilled || isApproving || isRejecting || isSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isApproving ? 'Approving...' : 'Lock Answers & Continue'}
            </button>
            <button
              onClick={handleReject}
              disabled={isApproving || isRejecting || isSaving}
              className={`px-6 py-3 border-2 border-red-300 text-red-700 rounded-lg font-semibold transition-colors ${
                isApproving || isRejecting || isSaving
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-red-50'
              }`}
            >
              {isRejecting ? 'Clearing...' : 'Clear All'}
            </button>
          </div>

          {!allAnswersFilled && (
            <p className="text-sm text-amber-600 mt-4">
              ⚠️ Please answer all 8 questions before approving.
            </p>
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
                Your answers have been approved and locked with hash: <code className="font-mono bg-green-100 px-2 py-0.5 rounded">{hash}</code>.
                The next agent (Synthetic Founder) will use these answers to generate a base prompt.
              </p>
              {state?.artifact.approvedBy && (
                <p className="text-sm text-green-700 mt-2">
                  Approved by: <strong>{state.artifact.approvedBy}</strong>
                  {state.artifact.approvedAt && ` on ${new Date(state.artifact.approvedAt).toLocaleString()}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
