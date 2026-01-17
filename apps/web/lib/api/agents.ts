/**
 * Agent Data API Client
 *
 * Fetches agent-specific artifacts and state from the backend.
 * Each agent has different data structures stored in the database.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Foundry Architect - Get session with answers
 * TODO: Backend endpoint does not exist yet. Database model exists.
 * Needed: GET /api/projects/:id/foundry-sessions/latest
 */
export async function getFoundrySession(projectId: string, sessionId?: string) {
  // TODO: Uncomment when backend endpoint is available
  // const url = sessionId
  //   ? `${API_BASE_URL}/projects/${projectId}/foundry-sessions/${sessionId}`
  //   : `${API_BASE_URL}/projects/${projectId}/foundry-sessions/latest`;
  // const response = await fetch(url);
  // if (!response.ok) {
  //   if (response.status === 404) return null;
  //   throw new Error(`Failed to fetch foundry session: ${response.statusText}`);
  // }
  // return response.json();

  console.warn('getFoundrySession: Backend endpoint does not exist yet');
  return null;
}

/**
 * Synthetic Founder - Get answers/base prompt
 * TODO: Backend endpoint does not exist yet. Database model (SyntheticAnswer) exists.
 * Needed: GET /api/projects/:id/app-requests/:appRequestId/synthetic-answers
 */
export async function getSyntheticAnswers(projectId: string, appRequestId: string) {
  // TODO: Uncomment when backend endpoint is available
  // const response = await fetch(
  //   `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}/synthetic-answers`
  // );
  // if (!response.ok) {
  //   if (response.status === 404) return null;
  //   throw new Error(`Failed to fetch synthetic answers: ${response.statusText}`);
  // }
  // return response.json();

  console.warn('getSyntheticAnswers: Backend endpoint does not exist yet');
  return null;
}

/**
 * Screen Cartographer - Get screen definitions
 * TODO: Backend endpoint does not exist yet. Database models (ScreenIndex, ScreenDefinition) exist.
 * Needed: GET /api/projects/:id/app-requests/:appRequestId/screens
 */
export async function getScreenDefinitions(projectId: string, appRequestId: string) {
  // TODO: Uncomment when backend endpoint is available
  // const response = await fetch(
  //   `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}/screens`
  // );
  // if (!response.ok) {
  //   if (response.status === 404) return [];
  //   throw new Error(`Failed to fetch screens: ${response.statusText}`);
  // }
  // const data = await response.json();
  // return data.screens || [];

  console.warn('getScreenDefinitions: Backend endpoint does not exist yet');
  return [];
}

/**
 * Build Prompt Engineer - Get build prompts
 * TODO: Backend endpoint does not exist yet. Database model (BuildPrompt) exists.
 * Needed: GET /api/projects/:id/app-requests/:appRequestId/build-prompts
 */
export async function getBuildPrompts(projectId: string, appRequestId: string) {
  // TODO: Uncomment when backend endpoint is available
  // const response = await fetch(
  //   `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}/build-prompts`
  // );
  // if (!response.ok) {
  //   if (response.status === 404) return [];
  //   throw new Error(`Failed to fetch build prompts: ${response.statusText}`);
  // }
  // const data = await response.json();
  // return data.buildPrompts || [];

  console.warn('getBuildPrompts: Backend endpoint does not exist yet');
  return [];
}

/**
 * Execution Planner - Get execution plans
 * TODO: Backend endpoint does not exist yet. Database models (ExecutionPlan, ExecutionUnit) exist.
 * Needed: GET /api/projects/:id/app-requests/:appRequestId/execution-plans
 */
export async function getExecutionPlans(projectId: string, appRequestId: string) {
  // TODO: Uncomment when backend endpoint is available
  // const response = await fetch(
  //   `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}/execution-plans`
  // );
  // if (!response.ok) {
  //   if (response.status === 404) return [];
  //   throw new Error(`Failed to fetch execution plans: ${response.statusText}`);
  // }
  // const data = await response.json();
  // return data.executionPlans || [];

  console.warn('getExecutionPlans: Backend endpoint does not exist yet');
  return [];
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
 * TODO: Backend endpoint does not exist yet. Database models (CompletionDecision, CompletionReport) exist.
 * Needed: GET /api/projects/:id/app-requests/:appRequestId/completion-report
 */
export async function getCompletionReport(projectId: string, appRequestId: string) {
  // TODO: Uncomment when backend endpoint is available
  // const response = await fetch(
  //   `${API_BASE_URL}/projects/${projectId}/app-requests/${appRequestId}/completion-report`
  // );
  // if (!response.ok) {
  //   if (response.status === 404) return null;
  //   throw new Error(`Failed to fetch completion report: ${response.statusText}`);
  // }
  // return response.json();

  console.warn('getCompletionReport: Backend endpoint does not exist yet');
  return null;
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
