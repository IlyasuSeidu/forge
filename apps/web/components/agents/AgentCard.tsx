/**
 * Agent Card Component
 *
 * Individual card in the Agent Timeline sidebar.
 * Shows agent icon, name, status, and hash (if approved).
 */

'use client';

import Link from 'next/link';
import { AgentMetadata, AgentState } from '@/lib/agents';
import { StatusIndicator } from './StatusIndicator';
import { HashBadge } from './HashBadge';

interface AgentCardProps {
  agent: AgentMetadata;
  state: AgentState;
  projectId: string;
  isActive: boolean;
}

export function AgentCard({ agent, state, projectId, isActive }: AgentCardProps) {
  const baseClasses = 'flex items-start gap-3 p-3 rounded-lg w-full transition-all';
  const activeClasses = isActive
    ? 'bg-blue-50 border-2 border-blue-500 shadow-sm'
    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50';
  const failedClasses = state.status === 'failed' ? 'border-red-300 bg-red-50' : '';

  return (
    <Link
      href={`/projects/${projectId}/${agent.route}`}
      className={`${baseClasses} ${activeClasses} ${failedClasses}`}
    >
      {/* Icon */}
      <span className="text-2xl flex-shrink-0" aria-label={agent.name}>
        {agent.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 truncate">{agent.name}</div>
        <div className="mt-1">
          <StatusIndicator status={state.status} size="sm" />
        </div>
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
    </Link>
  );
}
