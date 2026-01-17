/**
 * Agent Card Component
 *
 * Individual card in the Agent Timeline sidebar.
 * Shows agent icon, name, status, artifact summary, input hashes, and hash (if approved).
 */

'use client';

import Link from 'next/link';
import { AgentMetadata, AgentState } from '@/lib/agents';
import { StatusIndicator } from './StatusIndicator';
import { HashBadge } from './HashBadge';
import { getAgentSummary, getAgentInputHashes } from '@/lib/agentProgress';

interface AgentCardProps {
  agent: AgentMetadata;
  state: AgentState;
  projectId: string;
  isActive: boolean;
  allAgentStates: AgentState[];
}

export function AgentCard({ agent, state, projectId, isActive, allAgentStates }: AgentCardProps) {
  const baseClasses = 'flex items-start gap-3 p-3 rounded-lg w-full transition-all';
  const activeClasses = isActive
    ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50';
  const failedClasses = state.status === 'failed' ? 'border-red-300 bg-red-50' : '';
  const approvedClasses = state.status === 'approved' ? 'bg-green-50 border-green-200' : '';

  const summary = getAgentSummary(agent.id, state);
  const inputHashes = getAgentInputHashes(agent.id, allAgentStates);

  return (
    <Link
      href={`/projects/${projectId}/${agent.route}`}
      className={`${baseClasses} ${activeClasses} ${failedClasses} ${approvedClasses}`}
    >
      {/* Icon */}
      <span className="text-2xl flex-shrink-0" aria-label={agent.name}>
        {agent.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>

        {/* Artifact Summary */}
        <div className="text-xs text-gray-600 mt-0.5 truncate">{summary}</div>

        {/* Status */}
        <div className="mt-1">
          <StatusIndicator status={state.status} size="sm" />
        </div>

        {/* Input Hashes */}
        {inputHashes.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">inputs:</span>
            {inputHashes.map((hash, idx) => (
              <code key={idx} className="text-xs font-mono text-gray-700 bg-gray-100 px-1 rounded">
                {hash}
              </code>
            ))}
          </div>
        )}
      </div>

      {/* Hash Badge (if approved) */}
      {state.hash && (
        <div className="flex-shrink-0">
          <HashBadge hash={state.hash} size="sm" />
        </div>
      )}

      {/* Error Indicator */}
      {state.status === 'failed' && (
        <div className="flex-shrink-0" title={state.error || 'Agent failed'}>
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      {/* Approved Lock Indicator */}
      {state.status === 'approved' && (
        <div className="flex-shrink-0" title="Hash-locked and immutable">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      )}
    </Link>
  );
}
