/**
 * Project State API Client
 *
 * Unified API for fetching complete project state including all 17 agents
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type AgentStatus = 'pending' | 'awaiting_approval' | 'approved' | 'failed' | 'in_progress';

export interface AgentState {
  agentId: string;
  status: AgentStatus;
  artifactHash?: string;
  inputHashes?: string[];
  updatedAt?: string;
}

export interface ConductorState {
  state: string;
  updatedAt?: string;
}

export interface LatestAppRequest {
  id: string;
  status: string;
  prompt: string;
  createdAt: string;
}

export interface ProjectCapabilities {
  canPreview: boolean;
  canDownload: boolean;
  hasActivePreview: boolean;
  previewUrl: string | null;
}

export interface ProjectState {
  project: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
  conductorState: ConductorState | null;
  latestAppRequest: LatestAppRequest | null;
  agentStates: AgentState[];
  capabilities: ProjectCapabilities;
}

/**
 * Fetches comprehensive project state including all 17 agents' status
 * This is the single source of truth for project/agent state in the frontend
 */
export async function getProjectState(projectId: string): Promise<ProjectState> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/state`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Project ${projectId} not found`);
    }
    throw new Error(`Failed to fetch project state: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper to find a specific agent's state from project state
 */
export function getAgentState(projectState: ProjectState, agentId: string): AgentState | undefined {
  return projectState.agentStates.find((agent) => agent.agentId === agentId);
}

/**
 * Helper to check if an agent is in a specific status
 */
export function isAgentStatus(
  projectState: ProjectState,
  agentId: string,
  status: AgentStatus
): boolean {
  const agent = getAgentState(projectState, agentId);
  return agent?.status === status;
}

/**
 * Helper to get the first incomplete agent (for "Resume Journey" logic)
 */
export function getFirstIncompleteAgent(projectState: ProjectState): AgentState | null {
  return projectState.agentStates.find((agent) => agent.status !== 'approved') || null;
}

// ============================================================================
// Preview Runtime API
// ============================================================================

export type PreviewStatus = 'READY' | 'STARTING' | 'BUILDING' | 'RUNNING' | 'FAILED' | 'TERMINATED';

export interface PreviewSessionStatus {
  sessionId: string;
  status: PreviewStatus;
  previewUrl: string | null;
  failureStage?: string;
  failureOutput?: string;
}

export interface StartPreviewResponse {
  sessionId: string;
  message: string;
}

/**
 * Starts a new preview session for the given app request
 * Precondition: CompletionReport verdict must be COMPLETE
 */
export async function startPreview(appRequestId: string): Promise<StartPreviewResponse> {
  const response = await fetch(`${API_BASE_URL}/preview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appRequestId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || `Failed to start preview: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Gets the current status of a preview session
 */
export async function getPreviewStatus(sessionId: string): Promise<PreviewSessionStatus | null> {
  const response = await fetch(`${API_BASE_URL}/preview/status/${sessionId}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch preview status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Terminates a running preview session
 */
export async function terminatePreview(sessionId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/preview/terminate/${sessionId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Preview session not found');
    }
    throw new Error(`Failed to terminate preview: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Export/Download API
// ============================================================================

/**
 * Downloads project workspace as a ZIP file
 * Precondition: CompletionReport verdict must be COMPLETE
 *
 * @param projectId - The project ID to download
 * @returns The ZIP file as a Blob
 */
export async function downloadProjectZip(projectId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/export.zip`);

  if (!response.ok) {
    if (response.status === 422) {
      const error = await response.json();
      throw new Error(error.details || 'Project export not available');
    }
    if (response.status === 404) {
      throw new Error('Project workspace not found');
    }
    throw new Error(`Failed to download project: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Helper to trigger browser download of the ZIP file
 *
 * @param projectId - The project ID to download
 * @param projectName - Optional project name for filename (defaults to projectId)
 */
export async function triggerProjectDownload(
  projectId: string,
  projectName?: string
): Promise<void> {
  try {
    const blob = await downloadProjectZip(projectId);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || projectId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw error;
  }
}
