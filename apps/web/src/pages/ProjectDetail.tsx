import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { Project, Task, Execution, Approval } from '../types';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { StatusBadge } from '../components/StatusBadge';

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<{
    approvalId: string;
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProjectData() {
      if (!projectId) return;

      try {
        setLoading(true);
        setError(null);

        const [projectData, tasksData, executionsData, approvalsData] =
          await Promise.all([
            api.getProject(projectId),
            api.getTasks(projectId),
            api.getExecutions(projectId),
            api.getApprovals(projectId),
          ]);

        if (mounted) {
          setProject(projectData);
          setTasks(tasksData.tasks);
          setExecutions(executionsData);
          setApprovals(approvalsData.approvals);
        }
      } catch (err) {
        if (mounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load project data');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProjectData();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function handleApprove(approvalId: string) {
    if (!projectId) return;

    try {
      setApprovalAction({ approvalId, loading: true });
      await api.approveApproval(approvalId);

      // Reload data to reflect changes
      const [executionsData, approvalsData] = await Promise.all([
        api.getExecutions(projectId),
        api.getApprovals(projectId),
      ]);
      setExecutions(executionsData);
      setApprovals(approvalsData.approvals);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to approve');
      }
    } finally {
      setApprovalAction(null);
    }
  }

  async function handleReject(approvalId: string) {
    if (!projectId) return;

    try {
      setApprovalAction({ approvalId, loading: true });
      await api.rejectApproval(approvalId);

      // Reload data to reflect changes
      const [executionsData, approvalsData] = await Promise.all([
        api.getExecutions(projectId),
        api.getApprovals(projectId),
      ]);
      setExecutions(executionsData);
      setApprovals(approvalsData.approvals);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reject');
      }
    } finally {
      setApprovalAction(null);
    }
  }

  if (loading) {
    return <Loading message="Loading project..." />;
  }

  if (error) {
    return <ErrorMessage message={error} title="Failed to Load Project" />;
  }

  if (!project) {
    return <ErrorMessage message="Project not found" title="Not Found" />;
  }

  return (
    <div>
      {/* Project Header */}
      <div className="mb-8">
        <Link
          to="/"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
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
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">{project.name}</h1>
        <p className="mt-2 text-gray-600">{project.description}</p>
        <div className="mt-4 text-sm text-gray-500">
          Created {new Date(project.createdAt).toLocaleDateString()} • Updated{' '}
          {new Date(project.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* Approvals Section */}
      {approvals.filter((a) => a.status === 'pending').length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Approvals
          </h2>
          <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden">
            <div className="divide-y divide-yellow-100">
              {approvals
                .filter((approval) => approval.status === 'pending')
                .map((approval) => {
                  const execution = executions.find(
                    (e) => e.id === approval.executionId
                  );
                  const isActionPending =
                    approvalAction?.approvalId === approval.id;

                  return (
                    <div
                      key={approval.id}
                      className="p-4 bg-yellow-50 hover:bg-yellow-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-yellow-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                            <h3 className="text-sm font-medium text-gray-900">
                              {approval.type === 'execution_start'
                                ? 'Execution Start Approval Required'
                                : 'Task Completion Approval Required'}
                            </h3>
                          </div>
                          <p className="mt-2 text-sm text-gray-700">
                            {approval.type === 'execution_start' ? (
                              <>
                                Execution{' '}
                                <span className="font-mono text-xs">
                                  {approval.executionId.slice(0, 8)}
                                </span>{' '}
                                needs approval to start.
                                {execution && (
                                  <span className="ml-1">
                                    Status:{' '}
                                    <span className="font-medium">
                                      {execution.status}
                                    </span>
                                  </span>
                                )}
                              </>
                            ) : (
                              `Task completion requires approval`
                            )}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Requested{' '}
                            {new Date(approval.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            disabled={isActionPending}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {isActionPending ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(approval.id)}
                            disabled={isActionPending}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {isActionPending ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tasks</h2>
        {tasks.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">No tasks defined for this project</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {task.description}
                      </p>
                      {task.finishedAt && (
                        <p className="mt-1 text-xs text-gray-400">
                          Completed {new Date(task.finishedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={task.status} type="task" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Executions Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Executions</h2>
        {executions.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">No executions started yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {executions.map((execution) => (
                <Link
                  key={execution.id}
                  to={`/projects/${projectId}/executions/${execution.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-mono text-gray-500 mr-3">
                          {execution.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={execution.status} />
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {execution.startedAt && (
                          <span>
                            Started{' '}
                            {new Date(execution.startedAt).toLocaleString()}
                          </span>
                        )}
                        {execution.finishedAt && (
                          <span className="ml-2">
                            • Finished{' '}
                            {new Date(execution.finishedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
