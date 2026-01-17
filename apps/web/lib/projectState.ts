/**
 * Project State Utilities
 *
 * Deterministic helpers for computing project state and primary actions.
 */

import { AgentState } from './agents';

export type ProjectStage = 'intent' | 'planning' | 'visual' | 'build' | 'verification' | 'complete';
export type ProjectStatus = 'in_progress' | 'awaiting_approval' | 'complete' | 'failed';

/**
 * Compute current project stage based on approved agent count
 */
export function computeProjectStage(approvedCount: number): ProjectStage {
  if (approvedCount >= 17) return 'complete';
  if (approvedCount >= 13) return 'verification';
  if (approvedCount >= 10) return 'build';
  if (approvedCount >= 6) return 'visual';
  if (approvedCount >= 2) return 'planning';
  return 'intent';
}

/**
 * Get human-readable stage name
 */
export function getStageLabel(stage: ProjectStage): string {
  switch (stage) {
    case 'intent':
      return 'Understanding Intent';
    case 'planning':
      return 'Planning Structure';
    case 'visual':
      return 'Designing Visuals';
    case 'build':
      return 'Building Application';
    case 'verification':
      return 'Verifying Quality';
    case 'complete':
      return 'Complete';
  }
}

/**
 * Compute overall project status
 */
export function computeProjectStatus(agentStates: AgentState[]): ProjectStatus {
  const hasFailure = agentStates.some((s) => s.status === 'failed');
  if (hasFailure) return 'failed';

  const allApproved = agentStates.every((s) => s.status === 'approved');
  if (allApproved) return 'complete';

  const hasAwaitingApproval = agentStates.some((s) => s.status === 'awaiting_approval');
  if (hasAwaitingApproval) return 'awaiting_approval';

  return 'in_progress';
}

/**
 * Get the first incomplete agent
 */
export function getFirstIncompleteAgent(agentStates: AgentState[]): AgentState | null {
  return agentStates.find((s) => s.status !== 'approved') || null;
}

/**
 * Get primary call-to-action based on project state
 */
export function getPrimaryCTA(
  status: ProjectStatus,
  firstIncompleteAgent: AgentState | null,
  projectId: string
): {
  label: string;
  href: string;
  enabled: boolean;
} {
  switch (status) {
    case 'complete':
      return {
        label: 'Preview App',
        href: `/projects/${projectId}/preview`,
        enabled: true,
      };
    case 'awaiting_approval':
      if (firstIncompleteAgent) {
        return {
          label: 'Review & Approve',
          href: `/projects/${projectId}/${firstIncompleteAgent.id}`,
          enabled: true,
        };
      }
      return {
        label: 'Continue',
        href: `/projects/${projectId}/foundry-architect`,
        enabled: true,
      };
    case 'failed':
      return {
        label: 'Review Failure',
        href: `/projects/${projectId}/repair-plan-generator`,
        enabled: true,
      };
    case 'in_progress':
    default:
      if (firstIncompleteAgent) {
        return {
          label: 'Continue',
          href: `/projects/${projectId}/${firstIncompleteAgent.id}`,
          enabled: true,
        };
      }
      return {
        label: 'Continue',
        href: `/projects/${projectId}/foundry-architect`,
        enabled: true,
      };
  }
}

/**
 * Get "what happens next" message
 */
export function getNextStepMessage(status: ProjectStatus, firstIncompleteAgent: AgentState | null): string {
  switch (status) {
    case 'complete':
      return 'Your project is complete. Preview the app or download the source code.';
    case 'awaiting_approval':
      return 'Review and approve the proposed changes to continue.';
    case 'failed':
      return 'Verification failed. Review the failure and select a repair option.';
    case 'in_progress':
    default:
      if (firstIncompleteAgent) {
        return `Continue to ${getAgentDisplayName(firstIncompleteAgent.id)} to progress.`;
      }
      return 'Begin your project by answering foundational questions.';
  }
}

/**
 * Get agent display name from ID
 */
function getAgentDisplayName(agentId: string): string {
  const names: Record<string, string> = {
    'foundry-architect': 'Foundry Architect',
    'synthetic-founder': 'Synthetic Founder',
    'product-strategist': 'Product Strategist',
    'screen-cartographer': 'Screen Cartographer',
    'journey-orchestrator': 'Journey Orchestrator',
    vra: 'Visual Rendering Authority',
    dvnl: 'Deterministic Visual Normalizer',
    vca: 'Visual Composition Authority',
    vcra: 'Visual Code Rendering Authority',
    'build-prompt': 'Build Prompt Engineer',
    'execution-planner': 'Execution Planner',
    'forge-implementer': 'Forge Implementer',
    'verification-executor': 'Verification Executor',
    'verification-report-generator': 'Verification Report Generator',
    'repair-plan-generator': 'Repair Plan Generator',
    repair: 'Repair Agent',
    completion: 'Completion Auditor',
  };
  return names[agentId] || agentId;
}

/**
 * Check if preview is available
 */
export function isPreviewAvailable(agentStates: AgentState[]): boolean {
  // Preview available if Completion Auditor has approved (verdict: COMPLETE)
  const completionAgent = agentStates.find((s) => s.id === 'completion');
  return completionAgent?.status === 'approved';
}

/**
 * Check if download is available
 */
export function isDownloadAvailable(agentStates: AgentState[]): boolean {
  // Download available if Completion Auditor has approved (verdict: COMPLETE)
  return isPreviewAvailable(agentStates);
}

/**
 * Check if verification report is available
 */
export function isVerificationReportAvailable(agentStates: AgentState[]): boolean {
  const verificationReportAgent = agentStates.find((s) => s.id === 'verification-report-generator');
  return verificationReportAgent?.status === 'approved';
}

/**
 * Check if completion certificate is available
 */
export function isCompletionCertificateAvailable(agentStates: AgentState[]): boolean {
  const completionAgent = agentStates.find((s) => s.id === 'completion');
  return completionAgent?.status === 'approved';
}
