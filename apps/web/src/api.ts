import type { Project, Task, Execution, ExecutionEvent, Artifact, Approval, AppRequest, Verification } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, options);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = 'UNKNOWN_ERROR';

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        errorCode = errorData.error.code || errorCode;
      }
    } catch {
      // If we can't parse error JSON, use default message
    }

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  return response.json();
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  // Projects
  async getProjects(): Promise<{ projects: Project[] }> {
    return fetchJson('/projects');
  },

  async getProject(projectId: string): Promise<Project> {
    return fetchJson(`/projects/${projectId}`);
  },

  // Tasks
  async getTasks(projectId: string): Promise<{ tasks: Task[] }> {
    return fetchJson(`/projects/${projectId}/tasks`);
  },

  // Executions
  async getExecutions(projectId: string): Promise<Execution[]> {
    // The backend returns an array directly, not wrapped
    return fetchJson(`/projects/${projectId}/executions`);
  },

  async getExecution(projectId: string, executionId: string): Promise<Execution> {
    return fetchJson(`/projects/${projectId}/executions/${executionId}`);
  },

  async getExecutionEvents(
    projectId: string,
    executionId: string
  ): Promise<{ events: ExecutionEvent[] }> {
    return fetchJson(`/projects/${projectId}/executions/${executionId}/events`);
  },

  // Artifacts
  async getArtifacts(
    projectId: string,
    filters?: { executionId?: string; taskId?: string }
  ): Promise<Artifact[]> {
    const params = new URLSearchParams();
    if (filters?.executionId) params.set('executionId', filters.executionId);
    if (filters?.taskId) params.set('taskId', filters.taskId);

    const query = params.toString();
    const url = `/projects/${projectId}/artifacts${query ? `?${query}` : ''}`;
    return fetchJson(url);
  },

  async getExecutionArtifacts(
    projectId: string,
    executionId: string,
    taskId?: string
  ): Promise<Artifact[]> {
    const params = new URLSearchParams();
    if (taskId) params.set('taskId', taskId);

    const query = params.toString();
    const url = `/projects/${projectId}/executions/${executionId}/artifacts${
      query ? `?${query}` : ''
    }`;
    return fetchJson(url);
  },

  // Approvals
  async getApprovals(projectId: string): Promise<{ approvals: Approval[] }> {
    return fetchJson(`/projects/${projectId}/approvals`);
  },

  async approveApproval(approvalId: string, reason?: string): Promise<Approval> {
    return postJson(`/approvals/${approvalId}/approve`, { reason });
  },

  async rejectApproval(approvalId: string, reason?: string): Promise<Approval> {
    return postJson(`/approvals/${approvalId}/reject`, { reason });
  },

  // App Requests
  async getAppRequests(projectId: string): Promise<{ appRequests: AppRequest[] }> {
    return fetchJson(`/projects/${projectId}/app-requests`);
  },

  async getAppRequest(projectId: string, appRequestId: string): Promise<AppRequest> {
    return fetchJson(`/projects/${projectId}/app-requests/${appRequestId}`);
  },

  async createAppRequest(projectId: string, prompt: string): Promise<AppRequest> {
    return postJson(`/projects/${projectId}/app-requests`, { prompt });
  },

  // Artifact content and download
  getArtifactUrl(projectId: string, executionId: string, artifactPath: string): string {
    return `${API_BASE_URL}/projects/${projectId}/executions/${executionId}/artifacts/${artifactPath}`;
  },

  getDownloadUrl(projectId: string, executionId: string): string {
    return `${API_BASE_URL}/projects/${projectId}/executions/${executionId}/download`;
  },

  getPreviewUrl(projectId: string, executionId: string): string {
    // Preview the index.html file if it exists
    return `${API_BASE_URL}/projects/${projectId}/executions/${executionId}/artifacts/index.html`;
  },

  // Verification
  async getVerification(projectId: string, appRequestId: string): Promise<{ verification: Verification | null }> {
    return fetchJson(`/projects/${projectId}/app-requests/${appRequestId}/verification`);
  },
};

export { ApiError };
