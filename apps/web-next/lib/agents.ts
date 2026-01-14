/**
 * Forge Agent Metadata
 *
 * Defines all 17 agents in Forge's assembly line.
 * This is the source of truth for agent order, icons, and routing.
 */

// ============================================================================
// AGENT STATUS
// ============================================================================

export type AgentStatus =
  | 'pending'           // Not started
  | 'in_progress'       // Agent working
  | 'awaiting_approval' // User action required
  | 'approved'          // Hash-locked and approved
  | 'failed';           // Error (user must intervene)

export interface AgentState {
  id: string;
  status: AgentStatus;
  hash?: string;
  approvedAt?: string;
  error?: string;
}

// ============================================================================
// AGENT METADATA
// ============================================================================

export interface AgentMetadata {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  icon: string;
  description: string;
  route: string;
}

// ============================================================================
// ALL 17 AGENTS (In Order)
// ============================================================================

export const AGENTS: AgentMetadata[] = [
  // TIER 1: STRATEGY & INTENT
  {
    id: 'foundry-architect',
    name: 'Foundry Architect',
    tier: 1,
    tierName: 'Strategy & Intent',
    icon: '🏗️',
    description: 'Asks 8 structured questions to understand your app',
    route: 'foundry-architect',
  },
  {
    id: 'synthetic-founder',
    name: 'Synthetic Founder',
    tier: 1,
    tierName: 'Strategy & Intent',
    icon: '🤖',
    description: 'Provides AI-assisted answers to foundational questions',
    route: 'synthetic-founder',
  },

  // TIER 2: PLANNING & STRUCTURE
  {
    id: 'product-strategist',
    name: 'Product Strategist',
    tier: 2,
    tierName: 'Planning & Structure',
    icon: '📋',
    description: 'Creates master plan and implementation roadmap',
    route: 'product-strategist',
  },
  {
    id: 'screen-cartographer',
    name: 'Screen Cartographer',
    tier: 2,
    tierName: 'Planning & Structure',
    icon: '🗺️',
    description: 'Maps out all screens in your app',
    route: 'screen-cartographer',
  },
  {
    id: 'journey-orchestrator',
    name: 'Journey Orchestrator',
    tier: 2,
    tierName: 'Planning & Structure',
    icon: '🎭',
    description: 'Defines user roles and behavioral flows',
    route: 'journey-orchestrator',
  },

  // TIER 3: VISUAL INTELLIGENCE
  {
    id: 'vra',
    name: 'Visual Rendering Authority',
    tier: 3,
    tierName: 'Visual Intelligence',
    icon: '👁️',
    description: 'Expands screens into explicit visual sections',
    route: 'vra',
  },
  {
    id: 'dvnl',
    name: 'Deterministic Visual Normalizer',
    tier: 3,
    tierName: 'Visual Intelligence',
    icon: '🎨',
    description: 'Prevents visual clutter and maximalism',
    route: 'dvnl',
  },
  {
    id: 'vca',
    name: 'Visual Composition Authority',
    tier: 3,
    tierName: 'Visual Intelligence',
    icon: '📐',
    description: 'Decides how screens are visually composed',
    route: 'vca',
  },
  {
    id: 'vcra',
    name: 'Visual Code Rendering Authority',
    tier: 3,
    tierName: 'Visual Intelligence',
    icon: '💻',
    description: 'Generates production-ready React code for mockups',
    route: 'vcra',
  },

  // TIER 4: PROMPT & EXECUTION
  {
    id: 'build-prompt',
    name: 'Build Prompt Engineer',
    tier: 4,
    tierName: 'Prompt & Execution',
    icon: '📝',
    description: 'Creates deterministic build instructions (MBOM)',
    route: 'build-prompt',
  },
  {
    id: 'execution-plan',
    name: 'Execution Planner',
    tier: 4,
    tierName: 'Prompt & Execution',
    icon: '📊',
    description: 'Sequences tasks in deterministic order',
    route: 'execution-plan',
  },
  {
    id: 'implementation',
    name: 'Forge Implementer',
    tier: 4,
    tierName: 'Prompt & Execution',
    icon: '⚙️',
    description: 'Executes tasks exactly as planned (robotic executor)',
    route: 'implementation',
  },

  // TIER 5: VERIFICATION & COMPLETION
  {
    id: 'verification-executor',
    name: 'Verification Executor',
    tier: 5,
    tierName: 'Verification & Completion',
    icon: '🔍',
    description: 'Runs verification commands mechanically',
    route: 'verification-executor',
  },
  {
    id: 'verification-report',
    name: 'Verification Report Generator',
    tier: 5,
    tierName: 'Verification & Completion',
    icon: '📄',
    description: 'Projects verification results (no judgment)',
    route: 'verification-report',
  },
  {
    id: 'repair-plan',
    name: 'Repair Plan Generator',
    tier: 5,
    tierName: 'Verification & Completion',
    icon: '🔧',
    description: 'Proposes repair options (human selects)',
    route: 'repair-plan',
  },
  {
    id: 'repair',
    name: 'Repair Agent',
    tier: 5,
    tierName: 'Verification & Completion',
    icon: '🛠️',
    description: 'Executes approved repairs (bounded executor)',
    route: 'repair',
  },
  {
    id: 'completion',
    name: 'Completion Auditor',
    tier: 5,
    tierName: 'Verification & Completion',
    icon: '✅',
    description: 'Final gate: COMPLETE or NOT_COMPLETE',
    route: 'completion',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAgentById(id: string): AgentMetadata | undefined {
  return AGENTS.find((agent) => agent.id === id);
}

export function getAgentByRoute(route: string): AgentMetadata | undefined {
  return AGENTS.find((agent) => agent.route === route);
}

export function getAgentIndex(id: string): number {
  return AGENTS.findIndex((agent) => agent.id === id);
}

export function getNextAgent(currentId: string): AgentMetadata | null {
  const index = getAgentIndex(currentId);
  if (index === -1 || index === AGENTS.length - 1) return null;
  return AGENTS[index + 1];
}

export function getPreviousAgent(currentId: string): AgentMetadata | null {
  const index = getAgentIndex(currentId);
  if (index <= 0) return null;
  return AGENTS[index - 1];
}

// ============================================================================
// STATUS COLORS & LABELS
// ============================================================================

export const STATUS_COLORS = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    dot: 'bg-gray-400',
  },
  in_progress: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  awaiting_approval: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
};

export function getStatusLabel(status: AgentStatus): string {
  switch (status) {
    case 'pending':
      return 'Not Started';
    case 'in_progress':
      return 'Working...';
    case 'awaiting_approval':
      return 'Your Turn';
    case 'approved':
      return 'Complete';
    case 'failed':
      return 'Failed';
  }
}
