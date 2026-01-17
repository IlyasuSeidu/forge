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
