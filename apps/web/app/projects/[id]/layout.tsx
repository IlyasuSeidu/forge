/**
 * Project Layout
 *
 * Wraps all project pages with:
 * - Project header (name, status, safety indicators)
 * - Agent Timeline sidebar (PRIMARY navigation)
 * - Main content area
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { AgentTimeline } from '@/components/agents/AgentTimeline';
import { AgentState } from '@/lib/agents';
import { AgentStateProvider } from '@/lib/context/AgentStateContext';
import { getAgentStates } from '@/lib/api/agents';

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * Fetches project data and agent states from database (PRODUCTION)
 * Uses the new agent-states endpoint (single source of truth)
 */
async function getProjectDataAndAgents(projectId: string) {
  try {
    // Fetch agent states from new production endpoint
    const { agents } = await getAgentStates(projectId);

    // Map backend agent states to frontend AgentState format
    const agentStates: AgentState[] = agents.map((agent) => ({
      id: agent.id,
      status: agent.status,
      hash: agent.hash || undefined,
      approvedAt: agent.approvedAt || undefined,
      // approvalId populated if needed
      approvalId: agent.status === 'awaiting_approval' ? undefined : undefined,
    }));

    // Count approved agents and hashes (from real DB data)
    const approvalCount = agents.filter((a) => a.status === 'approved').length;
    const hashCount = agents.filter((a) => a.hash).length;

    // Derive project status from agent progress
    let status: 'planning' | 'building' | 'verifying' | 'complete' = 'planning';
    if (approvalCount >= 11) {
      // Forge Implementer done
      status = 'verifying';
    } else if (approvalCount >= 2) {
      // Past planning phase
      status = 'building';
    }
    if (approvalCount === 17) {
      status = 'complete';
    }

    // For now, hardcode project name (will be fixed when we add GET /projects/:id)
    const project = {
      id: projectId,
      name: 'My Project',
      status,
      createdAt: new Date().toISOString(),
      hashCount,
      approvalCount,
    };

    return {
      project,
      agentStates,
    };
  } catch (error) {
    console.error('Failed to fetch agent states:', error);

    // Fallback to minimal mock data if API fails
    return {
      project: {
        id: projectId,
        name: 'Project',
        status: 'planning' as const,
        createdAt: new Date().toISOString(),
        hashCount: 0,
        approvalCount: 0,
      },
      agentStates: [] as AgentState[],
    };
  }
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const { project, agentStates } = await getProjectDataAndAgents(id);

  return (
    <div className="flex flex-col h-screen">
      {/* Global Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔨</span>
            <span className="text-xl font-bold text-gray-900">Forge</span>
          </Link>

          {/* User Menu */}
          <div className="text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">
              ← All Projects
            </Link>
          </div>
        </div>
      </header>

      {/* Project Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <StatusBadge status={project.status} />
              <SafetyIndicators hashCount={project.hashCount} approvalCount={project.approvalCount} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Timeline + Agent Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Agent Timeline Sidebar */}
        <AgentTimeline projectId={id} agentStates={agentStates} />

        {/* Agent Content Area */}
        <AgentStateProvider agentStates={agentStates} projectId={id}>
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-5xl mx-auto p-8">{children}</div>
          </main>
        </AgentStateProvider>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'planning' | 'building' | 'verifying' | 'complete' }) {
  const config = {
    planning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planning' },
    building: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Building' },
    verifying: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Verifying' },
    complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bg} ${config.text} font-medium`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

function SafetyIndicators({ hashCount, approvalCount }: { hashCount: number; approvalCount: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5" title="Hash-locked artifacts">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>{hashCount} locked</span>
      </div>
      <div className="flex items-center gap-1.5" title="Approved gates">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{approvalCount} approved</span>
      </div>
    </div>
  );
}
