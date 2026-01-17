/**
 * Agent Progress Utilities
 *
 * Deterministic helpers for agent timeline intelligence:
 * - First incomplete agent detection
 * - Artifact summaries
 * - Input hash tracking
 *
 * NO AI. NO GUESSING.
 * Uses mock data until backend integration.
 */

import { AgentState } from './agents';

/**
 * Get the first agent that is not approved yet
 */
export function getFirstIncompleteAgent(agentStates: AgentState[]): AgentState | null {
  return agentStates.find((s) => s.status !== 'approved') || null;
}

/**
 * Get artifact summary for an agent (1 line max)
 */
export function getAgentSummary(agentId: string, agentState: AgentState): string {
  // If not approved yet, show status-based message
  if (agentState.status === 'pending') return 'Not started';
  if (agentState.status === 'in_progress') return 'Working...';
  if (agentState.status === 'awaiting_approval') return 'Ready for review';
  if (agentState.status === 'failed') return 'Failed - review needed';

  // If approved, show artifact summary
  switch (agentId) {
    case 'foundry-architect':
      return '8 questions locked';
    case 'synthetic-founder':
      return 'Base Prompt locked';
    case 'product-strategist':
      return 'Master + Implementation plan locked';
    case 'screen-cartographer':
      return '10 screens locked';
    case 'journey-orchestrator':
      return '10 journeys locked';
    case 'vra':
      return '10 visual contracts';
    case 'dvnl':
      return 'density caps applied';
    case 'vca':
      return 'composition rules locked';
    case 'vcra':
      return '10 mockups rendered';
    case 'build-prompt':
      return '3 build prompts';
    case 'execution-planner':
      return '3 execution plans / 48 tasks';
    case 'forge-implementer':
      return '3 logs / files created';
    case 'verification-executor':
      return '3 results / PASSED';
    case 'verification-report-generator':
      return '3 reports generated';
    case 'repair-plan-generator':
      return 'no repair needed';
    case 'repair':
      return 'no repair executed';
    case 'completion':
      return 'COMPLETE';
    default:
      return 'Approved';
  }
}

/**
 * Get input hashes for an agent (up to 2 hashes)
 * Returns shortened hash strings
 */
export function getAgentInputHashes(agentId: string, agentStates: AgentState[]): string[] {
  // Map of agent → input agents
  const inputDependencies: Record<string, string[]> = {
    'foundry-architect': [], // No inputs (first agent)
    'synthetic-founder': ['foundry-architect'],
    'product-strategist': ['synthetic-founder'],
    'screen-cartographer': ['product-strategist'],
    'journey-orchestrator': ['screen-cartographer'],
    vra: ['journey-orchestrator', 'screen-cartographer'],
    dvnl: ['vra'],
    vca: ['dvnl'],
    vcra: ['vca'],
    'build-prompt': ['vcra', 'product-strategist'],
    'execution-planner': ['build-prompt'],
    'forge-implementer': ['execution-planner'],
    'verification-executor': ['forge-implementer'],
    'verification-report-generator': ['verification-executor'],
    'repair-plan-generator': ['verification-report-generator'],
    repair: ['repair-plan-generator'],
    completion: ['repair'],
  };

  const inputAgentIds = inputDependencies[agentId] || [];

  // Get hashes from those agents (up to 2)
  const hashes: string[] = [];
  for (const inputId of inputAgentIds.slice(0, 2)) {
    const state = agentStates.find((s) => s.id === inputId);
    if (state?.hash) {
      // Shorten hash to first 8 characters
      hashes.push(state.hash.substring(0, 8));
    }
  }

  return hashes;
}
