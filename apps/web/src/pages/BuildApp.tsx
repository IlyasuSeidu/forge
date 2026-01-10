import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import type { AppRequest, Artifact, Verification, ExecutionEvent } from '../types';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { VerificationPanel } from '../components/VerificationPanel';
import {
  friendlyAppRequestStatus,
  getEstimatedTime,
  examplePrompts,
  buildPhases,
  getCurrentPhase,
  getNextSteps,
  getSoftWarnings,
  isPhaseFailed,
} from '../utils/friendlyText';

export default function BuildApp() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedRequest, setSelectedRequest] = useState<AppRequest | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');

  useEffect(() => {
    if (!projectId) return;
    loadData();
    // Auto-refresh every 3 seconds when there's an active request
    const interval = setInterval(() => {
      if (selectedRequest && ['pending', 'planned', 'building', 'verifying'].includes(selectedRequest.status)) {
        loadData();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [projectId, selectedRequest?.status]);

  const loadData = async () => {
    if (!projectId) return;
    try {
      const { appRequests: requests } = await api.getAppRequests(projectId);

      // Select the most recent request by default
      if (requests.length > 0 && !selectedRequest) {
        const latest = requests[0];
        setSelectedRequest(latest);

        // Load artifacts if completed
        if (latest.status === 'completed' && latest.executionId) {
          const arts = await api.getExecutionArtifacts(projectId, latest.executionId);
          setArtifacts(arts);
        }

        // Load verification and events if there's an execution
        if (latest.executionId) {
          try {
            const { verification: verif } = await api.getVerification(projectId, latest.id);
            setVerification(verif);

            const { events: evts } = await api.getExecutionEvents(projectId, latest.executionId);
            setEvents(evts);
          } catch (err) {
            // Verification might not exist yet, that's ok
            console.log('Verification not loaded:', err);
          }
        }
      } else if (selectedRequest) {
        // Update selected request
        const updated = requests.find(r => r.id === selectedRequest.id);
        if (updated) {
          setSelectedRequest(updated);

          // Load artifacts if completed
          if (updated.status === 'completed' && updated.executionId) {
            const arts = await api.getExecutionArtifacts(projectId, updated.executionId);
            setArtifacts(arts);
          }

          // Load verification and events if there's an execution
          if (updated.executionId) {
            try {
              const { verification: verif } = await api.getVerification(projectId, updated.id);
              setVerification(verif);

              const { events: evts } = await api.getExecutionEvents(projectId, updated.executionId);
              setEvents(evts);
            } catch (err) {
              // Verification might not exist yet, that's ok
              console.log('Verification not loaded:', err);
            }
          }
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !prompt.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const newRequest = await api.createAppRequest(projectId, prompt.trim());
      setSelectedRequest(newRequest);
      setPrompt('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create app request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  const handleDemoClick = async () => {
    if (!projectId || submitting) return;
    const demoPrompt = 'Build a simple calculator web app with basic operations (add, subtract, multiply, divide) and a clean UI';
    setPrompt(demoPrompt);
    setSubmitting(true);
    setError(null);

    try {
      const newRequest = await api.createAppRequest(projectId, demoPrompt);
      setSelectedRequest(newRequest);
      setPrompt('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create demo app');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!projectId || !selectedRequest?.executionId) return;

    try {
      // Download all artifacts as a ZIP file
      const url = `/api/projects/${projectId}/executions/${selectedRequest.executionId}/download`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `app-${selectedRequest.executionId.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download');
    }
  };

  const handlePreviewClick = () => {
    if (!projectId || !selectedRequest?.executionId) return;

    try {
      // Check if index.html exists
      const htmlArtifact = artifacts.find(a => a.path === 'index.html');
      if (!htmlArtifact) {
        setError('No preview available - index.html not found');
        return;
      }

      // Set the preview URL - the iframe will load the HTML and its resources (CSS, JS)
      const previewUrl = `/api/projects/${projectId}/executions/${selectedRequest.executionId}/artifacts/index.html`;
      setPreviewContent(previewUrl);
      setShowPreview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    }
  };

  const handleDownloadAnyway = () => {
    if (!projectId || !selectedRequest?.executionId) return;

    const confirmed = window.confirm(
      '⚠️ Warning: This app has known issues that may prevent it from working correctly.\n\n' +
      'Are you sure you want to download it anyway?'
    );

    if (confirmed) {
      handleDownload();
    }
  };

  const handleRestartBuild = () => {
    // Clear the current request and allow user to submit new prompt
    setSelectedRequest(null);
    setVerification(null);
    setEvents([]);
    setArtifacts([]);
    setPrompt('');
  };

  const handleAcknowledge = () => {
    // Just close/acknowledge - user can navigate away or start new build
    alert('Acknowledged. You can start a new build below or navigate to your project.');
  };

  if (loading) return <Loading message="Loading..." />;
  if (error && !selectedRequest) return <ErrorMessage title="Error" message={error} />;

  const currentPhase = selectedRequest ? getCurrentPhase(selectedRequest.status) : 'idea';
  const softWarnings = prompt ? getSoftWarnings(prompt) : [];
  const nextSteps = selectedRequest?.status === 'completed' && artifacts.length > 0
    ? getNextSteps(artifacts)
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}`}
          className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
        >
          ← Back to Project
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Build an App</h1>
        <p className="text-gray-600 mt-2">
          Describe what you want. Forge will plan it before building.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Visual Progress Indicator */}
      {selectedRequest && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Progress</h2>
          <div className="flex items-center justify-between">
            {buildPhases.map((phase, index) => {
              const currentPhaseIdx = getCurrentPhaseIndex(currentPhase);
              const isCompleted = currentPhaseIdx > index;
              const isCurrent = currentPhaseIdx === index;
              const isFailed = isPhaseFailed(selectedRequest.status, phase.id);

              let phaseColor = 'bg-gray-200 text-gray-400'; // Pending
              if (isFailed) {
                phaseColor = 'bg-red-500 text-white'; // Failed
              } else if (isCompleted || isCurrent) {
                phaseColor = 'bg-blue-500 text-white'; // Completed or in progress
              }

              return (
                <div key={phase.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${phaseColor}`}
                    >
                      {phase.icon}
                    </div>
                    <span className={`mt-2 text-sm font-medium ${isFailed ? 'text-red-600' : 'text-gray-700'}`}>
                      {phase.label}
                    </span>
                  </div>
                  {index < buildPhases.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        isFailed
                          ? 'bg-red-500'
                          : isCompleted
                          ? 'bg-blue-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <p className="text-lg font-medium text-gray-900">
              {friendlyAppRequestStatus(selectedRequest.status)}
            </p>
            {['pending', 'building', 'verifying'].includes(selectedRequest.status) && (
              <p className="text-sm text-gray-500 mt-1">
                {selectedRequest.status === 'verifying'
                  ? 'Testing your app and fixing any issues automatically...'
                  : getEstimatedTime(selectedRequest.status === 'pending' ? 'planning' : 'building')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Request Input Form */}
      {(!selectedRequest || selectedRequest.status === 'completed' || selectedRequest.status === 'failed' || selectedRequest.status === 'verification_failed') && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedRequest ? 'Build Another App' : 'What would you like to build?'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app idea... For example: 'Build a personal task manager with add, edit, and delete features'"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                disabled={submitting}
              />
              {softWarnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {softWarnings.map((warning, i) => (
                    <p key={i} className="text-sm text-yellow-700 flex items-start">
                      <span className="mr-1">ℹ️</span>
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!prompt.trim() || submitting}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Creating...' : 'Start Building'}
              </button>
              <button
                type="button"
                onClick={handleDemoClick}
                disabled={submitting}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
              >
                Try a Demo
              </button>
            </div>
          </form>

          {/* Example Prompts */}
          {!selectedRequest && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Or try one of these examples:</p>
              <div className="space-y-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example.prompt)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{example.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{example.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval Waiting State */}
      {selectedRequest?.status === 'planned' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Waiting for Your Approval</h3>
          <p className="text-yellow-800 mb-4">
            Forge has finished planning your app and needs your approval before building it.
          </p>
          <Link
            to={`/projects/${projectId}`}
            className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-medium"
          >
            Review & Approve Plan
          </Link>
        </div>
      )}

      {/* Verification Panel - shown for completed and verification_failed states */}
      {verification && (selectedRequest?.status === 'completed' || selectedRequest?.status === 'verification_failed') && (
        <VerificationPanel
          verification={verification}
          events={events}
          onDownloadAnyway={selectedRequest?.status === 'verification_failed' ? handleDownloadAnyway : undefined}
          onRestartBuild={selectedRequest?.status === 'verification_failed' ? handleRestartBuild : undefined}
          onAcknowledge={selectedRequest?.status === 'verification_failed' ? handleAcknowledge : undefined}
        />
      )}

      {/* Next Steps Panel - only show for successful completion */}
      {selectedRequest?.status === 'completed' && nextSteps.length > 0 && verification?.status === 'passed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
            <span className="mr-2">🎉</span>
            Next Steps:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-green-800">
            {nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleDownload}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              Download App
            </button>
            {artifacts.some(a => a.path === 'index.html') && (
              <button
                onClick={handlePreviewClick}
                className="border border-green-600 text-green-600 px-6 py-2 rounded-lg hover:bg-green-50 font-medium"
              >
                Preview App
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {selectedRequest?.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Something Went Wrong</h3>
          <p className="text-red-800 mb-2">
            {selectedRequest.errorReason || 'The app build failed. Please try again with a different description.'}
          </p>
          <p className="text-sm text-red-700">
            Tip: Try being more specific about what you want, or break your app into smaller pieces.
          </p>
        </div>
      )}

      {/* App Details */}
      {selectedRequest && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">App Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Your Request:</span>
              <p className="text-gray-900 mt-1">{selectedRequest.prompt}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <p className="text-gray-900 mt-1">{friendlyAppRequestStatus(selectedRequest.status)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Created:</span>
              <p className="text-gray-900 mt-1">
                {new Date(selectedRequest.createdAt).toLocaleString()}
              </p>
            </div>
            {selectedRequest.status === 'completed' && selectedRequest.executionId && (
              <div>
                <Link
                  to={`/projects/${projectId}/executions/${selectedRequest.executionId}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View Build Details →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && artifacts.some(a => a.path === 'index.html') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full h-5/6 flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">App Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 p-4">
              <p className="text-sm text-gray-600 mb-2">
                Note: This is a sandboxed preview. Some features may not work exactly as in production.
              </p>
              <iframe
                className="w-full h-full border border-gray-300 rounded"
                sandbox="allow-scripts allow-same-origin"
                title="App Preview"
                src={previewContent}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCurrentPhaseIndex(phase: string): number {
  const phases = ['idea', 'plan', 'approve', 'build', 'verify', 'ready'];
  return phases.indexOf(phase);
}
