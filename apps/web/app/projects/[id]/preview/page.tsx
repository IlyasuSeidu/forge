/**
 * Preview Runtime
 *
 * Start temporary isolated preview session for completed project.
 * Run → Observe → Destroy
 */

'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { api, type SessionStatus } from '@/lib/api';

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  // For demo purposes, we use projectId as appRequestId
  // In production, you'd fetch the actual appRequestId from the project
  const appRequestId = projectId;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [failureStage, setFailureStage] = useState<string | null>(null);
  const [failureOutput, setFailureOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Poll for status updates
  useEffect(() => {
    if (!sessionId) return;
    if (status === 'FAILED' || status === 'TERMINATED') return;

    const interval = setInterval(async () => {
      try {
        const statusData = await api.getPreviewStatus(sessionId);
        setStatus(statusData.status);
        setPreviewUrl(statusData.previewUrl);
        setFailureStage(statusData.failureStage);
        setFailureOutput(statusData.failureOutput);

        // Stop polling if terminal state reached
        if (statusData.status === 'FAILED' || statusData.status === 'TERMINATED') {
          clearInterval(interval);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error occurred');
        }
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [sessionId, status]);

  const handleStartPreview = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await api.startPreview(appRequestId);
      setSessionId(response.sessionId);
      setStatus('STARTING');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start preview');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleTerminatePreview = async () => {
    if (!sessionId) return;

    try {
      await api.terminatePreview(sessionId);
      setStatus('TERMINATED');
      setPreviewUrl(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to terminate preview');
      }
    }
  };

  const handleReset = () => {
    setSessionId(null);
    setStatus(null);
    setPreviewUrl(null);
    setFailureStage(null);
    setFailureOutput(null);
    setError(null);
  };

  const getStatusDisplay = (currentStatus: SessionStatus) => {
    switch (currentStatus) {
      case 'READY':
        return { label: 'Ready', color: 'bg-gray-100 text-gray-700', message: 'Ready to start' };
      case 'STARTING':
        return { label: 'Starting', color: 'bg-blue-100 text-blue-700', message: 'Container launching, installing dependencies...' };
      case 'BUILDING':
        return { label: 'Building', color: 'bg-yellow-100 text-yellow-700', message: 'Running build process...' };
      case 'RUNNING':
        return { label: 'Running', color: 'bg-green-100 text-green-700', message: 'Preview is live!' };
      case 'FAILED':
        return { label: 'Failed', color: 'bg-red-100 text-red-700', message: 'Preview failed' };
      case 'TERMINATED':
        return { label: 'Terminated', color: 'bg-gray-100 text-gray-700', message: 'Session ended' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">👁️</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Preview Runtime</h1>
            <p className="text-sm text-gray-600 mt-2">
              Start a temporary isolated session to preview your completed application.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">How Preview Works</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-blue-900 mb-1">Run → Observe → Destroy</div>
                <p className="text-sm text-blue-900">
                  Preview runtime creates a temporary isolated Docker container where your application runs. You can
                  interact with it, test features, and observe behavior. The session automatically terminates after
                  30 minutes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs">
                1
              </div>
              <div>
                <div className="font-semibold text-gray-900">Run</div>
                <div className="text-gray-600">Start isolated preview session with your built application</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs">
                2
              </div>
              <div>
                <div className="font-semibold text-gray-900">Observe</div>
                <div className="text-gray-600">Interact with the app, test features, explore functionality</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs">
                3
              </div>
              <div>
                <div className="font-semibold text-gray-900">Destroy</div>
                <div className="text-gray-600">Session ends automatically after 30 minutes or manual stop</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Status */}
      {status && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Session Status</h2>

          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusDisplay(status).color}`}>
                {getStatusDisplay(status).label}
              </span>
              <span className="text-sm text-gray-600">{getStatusDisplay(status).message}</span>
            </div>

            {/* Session ID */}
            {sessionId && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Session ID</div>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{sessionId}</code>
              </div>
            )}

            {/* Preview URL */}
            {status === 'RUNNING' && previewUrl && (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
                <div className="text-lg font-bold text-green-900 mb-2">Preview is Live!</div>
                <div className="mb-4">
                  <div className="text-sm text-green-800 mb-2">Your application is running at:</div>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-mono text-sm break-all"
                  >
                    {previewUrl}
                  </a>
                </div>
                <button
                  onClick={handleTerminatePreview}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                >
                  Stop Preview Session
                </button>
              </div>
            )}

            {/* Loading States */}
            {(status === 'STARTING' || status === 'BUILDING') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <div className="text-sm text-blue-900">{getStatusDisplay(status).message}</div>
                </div>
              </div>
            )}

            {/* Failure State */}
            {status === 'FAILED' && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
                <div className="text-lg font-bold text-red-900 mb-2">Preview Failed</div>

                {failureStage && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-red-800 mb-1">Failed at stage:</div>
                    <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-red-200">
                      {failureStage}
                    </code>
                  </div>
                )}

                {failureOutput && (
                  <div>
                    <div className="text-sm font-semibold text-red-800 mb-2">Raw Output:</div>
                    <pre className="bg-black text-green-400 p-4 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                      {failureOutput}
                    </pre>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Terminated State */}
            {status === 'TERMINATED' && (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
                <div className="text-gray-900 mb-2">Session has been terminated.</div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Start New Session
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action */}
      {!status && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Start Preview</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <div className="font-semibold text-red-900">Error</div>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleStartPreview}
              disabled={isStarting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {isStarting ? 'Starting...' : 'Start Preview Session'}
            </button>

            <Link
              href={`/projects/${projectId}/completion-auditor`}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              ← Back to Completion Auditor
            </Link>
          </div>
        </div>
      )}

      {/* Technical Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Technical Details</h2>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Preview sessions run in isolated Docker containers</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>No changes made during preview affect source code</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Sessions auto-expire after 30 minutes</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Resource limits: 1 CPU core, 512MB RAM</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Full terminal output available for debugging</div>
          </div>
        </div>
      </div>
    </div>
  );
}
