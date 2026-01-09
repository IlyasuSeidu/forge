import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { Execution, ExecutionEvent, Artifact } from '../types';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';

const AUTO_REFRESH_INTERVAL = 3000; // 3 seconds

export function ExecutionDetail() {
  const { projectId, executionId } = useParams<{
    projectId: string;
    executionId: string;
  }>();

  const [execution, setExecution] = useState<Execution | null>(null);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadExecutionData = useCallback(async () => {
    if (!projectId || !executionId) return;

    try {
      const [executionData, eventsData, artifactsData] = await Promise.all([
        api.getExecution(projectId, executionId),
        api.getExecutionEvents(projectId, executionId),
        api.getExecutionArtifacts(projectId, executionId),
      ]);

      setExecution(executionData);
      setEvents(eventsData.events);
      setArtifacts(artifactsData);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load execution data');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, executionId]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (mounted) {
        await loadExecutionData();
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [loadExecutionData]);

  // Auto-refresh when execution is running
  useEffect(() => {
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      loadExecutionData();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [execution, loadExecutionData]);

  if (loading) {
    return <Loading message="Loading execution..." />;
  }

  if (error) {
    return <ErrorMessage message={error} title="Failed to Load Execution" />;
  }

  if (!execution) {
    return <ErrorMessage message="Execution not found" title="Not Found" />;
  }

  const isActive = execution.status === 'running' || execution.status === 'paused';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}`}
          className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Project
        </Link>
      </div>

      {/* Execution Header */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Execution {execution.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-gray-500 font-mono mt-1">{execution.id}</p>
          </div>
          <StatusBadge status={execution.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {execution.startedAt && (
            <div>
              <span className="text-gray-500">Started:</span>
              <span className="ml-2 text-gray-900">
                {new Date(execution.startedAt).toLocaleString()}
              </span>
            </div>
          )}
          {execution.finishedAt && (
            <div>
              <span className="text-gray-500">Finished:</span>
              <span className="ml-2 text-gray-900">
                {new Date(execution.finishedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {isActive && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <div className="inline-block animate-pulse w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
            Auto-refreshing every 3 seconds • Last update:{' '}
            {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Events Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Timeline</h2>
        {events.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">No events recorded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className={`p-4 ${index === 0 ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {event.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-900">{event.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Artifacts */}
      {artifacts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Artifacts ({artifacts.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {artifact.type === 'directory' ? (
                        <svg
                          className="w-5 h-5 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-mono text-gray-900">
                        {artifact.path}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(artifact.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 uppercase">
                      {artifact.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getEventIcon(eventType: string) {
  const iconClass = 'w-5 h-5';

  if (eventType.includes('started')) {
    return (
      <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (eventType.includes('completed')) {
    return (
      <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (eventType.includes('failed')) {
    return (
      <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (eventType.includes('paused')) {
    return (
      <svg className={`${iconClass} text-yellow-500`} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg className={`${iconClass} text-gray-400`} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}
