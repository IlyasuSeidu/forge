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

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

// Mock data for now - will be replaced with real API calls
async function getProjectData(projectId: string) {
  // TODO: Replace with actual API call
  return {
    id: projectId,
    name: 'Fitness Habit Tracker',
    status: 'building' as const,
    createdAt: new Date().toISOString(),
    hashCount: 12, // 12 agents approved (up to Forge Implementer)
    approvalCount: 12, // 12 agents approved
  };
}

async function getAgentStates(projectId: string): Promise<AgentState[]> {
  // TODO: Replace with actual API call
  // For now, return mock data showing progression: Agents 1-9 approved, Agent 10 awaiting approval
  return [
    {
      id: 'foundry-architect',
      status: 'approved',
      hash: 'fa8c7d2e9b1a4f6e',
      approvedAt: '2026-01-14T14:30:00Z',
    },
    {
      id: 'synthetic-founder',
      status: 'approved',
      hash: 'b9d4e1f7c3a8d2e5',
      approvedAt: '2026-01-14T14:35:00Z',
    },
    {
      id: 'product-strategist',
      status: 'approved',
      hash: 'c4f8a2d9e7b1f3a6',
      approvedAt: '2026-01-14T14:40:00Z',
    },
    {
      id: 'screen-cartographer',
      status: 'approved',
      hash: 'd7e3f9a1b8c4d2e6',
      approvedAt: '2026-01-14T14:45:00Z',
    },
    {
      id: 'journey-orchestrator',
      status: 'approved',
      hash: 'e8f4b3c2d9a5e7f1',
      approvedAt: '2026-01-14T14:50:00Z',
    },
    {
      id: 'vra',
      status: 'approved',
      hash: 'f9a5b6d3e1c7f8a2',
      approvedAt: '2026-01-14T14:55:00Z',
    },
    {
      id: 'dvnl',
      status: 'approved',
      hash: 'g1b7c4e2f8a3d9e5',
      approvedAt: '2026-01-14T15:00:00Z',
    },
    {
      id: 'vca',
      status: 'approved',
      hash: 'h2c8d5f3a9b4e6f2',
      approvedAt: '2026-01-14T15:05:00Z',
    },
    {
      id: 'vcra',
      status: 'approved',
      hash: 'i3d9e6f4b1a5c7d3',
      approvedAt: '2026-01-14T15:10:00Z',
    },
    {
      id: 'build-prompt',
      status: 'approved',
      hash: 'j1k2l3m4n5o6p7q8',
      approvedAt: '2026-01-14T15:15:00Z',
    },
    {
      id: 'execution-planner',
      status: 'approved',
      hash: 'k1l2m3n4o5p6q7r8',
      approvedAt: '2026-01-14T15:20:00Z',
    },
    {
      id: 'forge-implementer',
      status: 'approved',
      hash: 'l1m2n3o4p5q6r7s8',
      approvedAt: '2026-01-14T15:25:00Z',
    },
    { id: 'verification-executor', status: 'awaiting_approval' },
    { id: 'verification-report', status: 'pending' },
    { id: 'repair-plan', status: 'pending' },
    { id: 'repair', status: 'pending' },
    { id: 'completion', status: 'pending' },
  ];
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const project = await getProjectData(id);
  const agentStates = await getAgentStates(id);

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
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto p-8">{children}</div>
        </main>
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
