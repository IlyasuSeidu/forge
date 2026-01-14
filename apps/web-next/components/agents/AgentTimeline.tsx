/**
 * Agent Timeline Component
 *
 * PRIMARY NAVIGATION for Forge.
 * Shows all 17 agents in a vertical sidebar with their current states.
 */

'use client';

import { usePathname } from 'next/navigation';
import { AGENTS, AgentState, getAgentByRoute } from '@/lib/agents';
import { AgentCard } from './AgentCard';

interface AgentTimelineProps {
  projectId: string;
  agentStates: AgentState[];
}

export function AgentTimeline({ projectId, agentStates }: AgentTimelineProps) {
  const pathname = usePathname();
  const currentAgent = getAgentByRoute(pathname);

  // Group agents by tier for visual separation
  const tierGroups = AGENTS.reduce((acc, agent) => {
    if (!acc[agent.tier]) {
      acc[agent.tier] = [];
    }
    acc[agent.tier].push(agent);
    return acc;
  }, {} as Record<number, typeof AGENTS>);

  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Agent Pipeline</h2>
          <p className="text-sm text-gray-600 mt-1">17 specialized agents building your app</p>
        </div>

        {/* Progress Summary */}
        <ProgressSummary agentStates={agentStates} />

        {/* Agents by Tier */}
        <div className="space-y-6 mt-6">
          {Object.entries(tierGroups).map(([tier, agents]) => {
            const tierName = agents[0]?.tierName || `Tier ${tier}`;

            return (
              <div key={tier}>
                {/* Tier Header */}
                <div className="mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tier {tier}: {tierName}
                  </h3>
                </div>

                {/* Agent Cards */}
                <div className="space-y-2">
                  {agents.map((agent) => {
                    const state =
                      agentStates.find((s) => s.id === agent.id) ||
                      ({ id: agent.id, status: 'pending' } as AgentState);

                    return (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        state={state}
                        projectId={projectId}
                        isActive={currentAgent?.id === agent.id}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProgressSummary({ agentStates }: { agentStates: AgentState[] }) {
  const completed = agentStates.filter((s) => s.status === 'approved').length;
  const inProgress = agentStates.filter((s) => s.status === 'in_progress').length;
  const awaitingApproval = agentStates.filter((s) => s.status === 'awaiting_approval').length;
  const failed = agentStates.filter((s) => s.status === 'failed').length;
  const total = AGENTS.length;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Progress</span>
          <span className="text-gray-600">
            {completed} / {total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Status Counts */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {inProgress > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-gray-700">{inProgress} working</span>
          </div>
        )}
        {awaitingApproval > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-gray-700">{awaitingApproval} your turn</span>
          </div>
        )}
        {failed > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-gray-700">{failed} failed</span>
          </div>
        )}
      </div>
    </div>
  );
}
