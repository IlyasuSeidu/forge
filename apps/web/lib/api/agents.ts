/**
 * Agent Data API Client
 *
 * Fetches agent-specific artifacts and state from the backend.
 * Each agent has different data structures stored in the database.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Foundry Architect - Get session with answers (LEGACY ENDPOINT)
 * Backend endpoint: GET /api/app-requests/:appRequestId/foundry-session
 * @deprecated Use getFoundryArchitectState() for production endpoints
 */
export async function getFoundrySession(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/foundry-session`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch foundry session: ${response.statusText}`);
  }

  const data = await response.json();
  return data.session || null;
}

// ============================================================================
// PRODUCTION ENDPOINTS: Foundry Architect (Agent 1)
// ============================================================================

export interface FoundryArchitectState {
  conductorState: {
    currentStatus: string;
    locked: boolean;
    awaitingHuman: boolean;
    pauseReason?: string;
    failureReason?: string;
  };
  artifact: {
    status: 'pending' | 'asking' | 'awaiting_approval' | 'approved';
    answers?: Record<string, string>;
    basePromptHash?: string;
    approvedBy?: string;
    approvedAt?: string;
  };
  uiState: 'pending' | 'awaiting_approval' | 'approved';
  questions: Array<{ id: string; question: string }>;
}

export interface FoundryArchitectSession {
  id: string;
  status: 'asking' | 'awaiting_approval' | 'approved';
  currentStep: number;
  createdAt: string;
}

/**
 * Foundry Architect - Get full state (PRODUCTION)
 * Backend endpoint: GET /api/projects/:projectId/foundry-architect
 */
export async function getFoundryArchitectState(projectId: string): Promise<FoundryArchitectState> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/foundry-architect`);

  if (!response.ok) {
    throw new Error(`Failed to fetch foundry architect state: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Foundry Architect - Start new session (PRODUCTION)
 * Backend endpoint: POST /api/projects/:projectId/foundry-architect/start
 */
export async function startFoundryArchitect(projectId: string): Promise<{
  success: boolean;
  session: FoundryArchitectSession;
  questions: Array<{ id: string; question: string }>;
}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/foundry-architect/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to start foundry architect: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Foundry Architect - Submit answers (PRODUCTION)
 * Backend endpoint: POST /api/projects/:projectId/foundry-architect/submit
 */
export async function submitFoundryAnswers(
  projectId: string,
  answers: Record<string, string>
): Promise<{
  success: boolean;
  session: {
    status: 'awaiting_approval';
    contractHash: string;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/foundry-architect/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to submit answers: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Foundry Architect - Approve answers (PRODUCTION)
 * Backend endpoint: POST /api/projects/:projectId/foundry-architect/approve
 */
export async function approveFoundryAnswers(
  projectId: string,
  approvedBy: string = 'human'
): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/foundry-architect/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to approve answers: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Foundry Architect - Reject answers (PRODUCTION)
 * Backend endpoint: POST /api/projects/:projectId/foundry-architect/reject
 */
export async function rejectFoundryAnswers(
  projectId: string,
  reason: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/foundry-architect/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Failed to reject answers: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Synthetic Founder - Get answers/base prompt
 * Backend endpoint: GET /api/app-requests/:appRequestId/synthetic-answers
 */
export async function getSyntheticAnswers(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/synthetic-answers`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch synthetic answers: ${response.statusText}`);
  }

  const data = await response.json();
  return data.answer || null;
}

/**
 * Screen Cartographer - Get screen index with definitions
 * Backend endpoint: GET /api/app-requests/:appRequestId/screen-index
 */
export async function getScreenDefinitions(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/screen-index`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch screen index: ${response.statusText}`);
  }

  const data = await response.json();
  return data.index || null;
}

/**
 * Build Prompt Engineer - Get build prompts
 * Backend endpoint: GET /api/app-requests/:appRequestId/build-prompts
 */
export async function getBuildPrompts(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/build-prompts`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch build prompts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.buildPrompts || [];
}

/**
 * Execution Planner - Get execution plans
 * Backend endpoint: GET /api/app-requests/:appRequestId/execution-plans
 */
export async function getExecutionPlans(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/execution-plans`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch execution plans: ${response.statusText}`);
  }

  const data = await response.json();
  return data.plans || [];
}

/**
 * Verification - Get latest verification (WORKING ENDPOINT ✅)
 * Returns basic verification status from the current verification system.
 * Note: This returns simple pass/fail status, not detailed step-by-step results.
 * The hardened verification system (VerificationResult model) is not yet exposed via API.
 */
export async function getVerification(projectId: string, appRequestId: string) {
  const response = await fetch(
    `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}/verification`
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch verification: ${response.statusText}`);
  }

  const data = await response.json();
  return data.verification || null;
}

/**
 * Completion Auditor - Get completion report
 * Backend endpoint: GET /api/app-requests/:appRequestId/completion-report
 */
export async function getCompletionReport(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/completion-report`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch completion report: ${response.statusText}`);
  }

  const data = await response.json();
  return data.report || null;
}

/**
 * Product Strategist - Get planning documents
 * Backend endpoint: GET /api/app-requests/:appRequestId/planning-documents
 */
export async function getPlanningDocuments(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/planning-documents`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch planning documents: ${response.statusText}`);
  }

  const data = await response.json();
  return data.documents || [];
}

/**
 * Journey Orchestrator - Get user journeys
 * Backend endpoint: GET /api/app-requests/:appRequestId/user-journeys
 */
export async function getUserJourneys(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/user-journeys`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch user journeys: ${response.statusText}`);
  }

  const data = await response.json();
  return data.journeys || [];
}

/**
 * VRA - Get visual expansion contracts
 * Backend endpoint: GET /api/app-requests/:appRequestId/visual-expansions
 */
export async function getVisualExpansions(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/visual-expansions`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch visual expansions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.expansions || [];
}

/**
 * DVNL - Get visual normalization contracts
 * Backend endpoint: GET /api/app-requests/:appRequestId/visual-normalizations
 */
export async function getVisualNormalizations(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/visual-normalizations`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch visual normalizations: ${response.statusText}`);
  }

  const data = await response.json();
  return data.normalizations || [];
}

/**
 * VCA - Get visual composition contracts
 * Backend endpoint: GET /api/app-requests/:appRequestId/visual-compositions
 */
export async function getVisualCompositions(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/visual-compositions`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch visual compositions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.compositions || [];
}

/**
 * VCRA - Get visual code rendering contracts
 * Backend endpoint: GET /api/app-requests/:appRequestId/visual-code-renderings
 */
export async function getVisualCodeRenderings(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/visual-code-renderings`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch visual code renderings: ${response.statusText}`);
  }

  const data = await response.json();
  return data.renderings || [];
}

/**
 * Forge Implementer - Get execution units
 * Backend endpoint: GET /api/app-requests/:appRequestId/execution-units
 */
export async function getExecutionUnits(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/execution-units`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch execution units: ${response.statusText}`);
  }

  const data = await response.json();
  return data.units || [];
}

/**
 * Verification Executor - Get verification results
 * Backend endpoint: GET /api/app-requests/:appRequestId/verification-results
 */
export async function getVerificationResults(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/verification-results`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch verification results: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Verification Report Generator - Get verification reports
 * Backend endpoint: GET /api/app-requests/:appRequestId/verification-reports
 */
export async function getVerificationReports(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/verification-reports`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch verification reports: ${response.statusText}`);
  }

  const data = await response.json();
  return data.reports || [];
}

/**
 * Repair Plan Generator - Get repair plans
 * Backend endpoint: GET /api/app-requests/:appRequestId/repair-plans
 */
export async function getRepairPlans(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/repair-plans`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch repair plans: ${response.statusText}`);
  }

  const data = await response.json();
  return data.plans || [];
}

/**
 * Repair Agent - Get repair execution logs
 * Backend endpoint: GET /api/app-requests/:appRequestId/repair-executions
 */
export async function getRepairExecutions(appRequestId: string) {
  const response = await fetch(`${API_BASE_URL}/app-requests/${appRequestId}/repair-executions`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch repair executions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.logs || [];
}

/**
 * Generic: Get app request details
 */
export async function getAppRequest(projectId: string, appRequestId: string) {
  const response = await fetch(
    `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch app request: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generic: List all app requests for a project
 */
export async function getAppRequests(projectId: string) {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/app-requests`);

  if (!response.ok) {
    throw new Error(`Failed to fetch app requests: ${response.statusText}`);
  }

  const data = await response.json();
  return data.appRequests || [];
}
