/**
 * Agent State Context
 *
 * Provides agent states to all child pages within a project.
 * Allows pages to access their own approval state without prop drilling.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { AgentState } from '../agents';

interface AgentStateContextValue {
  agentStates: AgentState[];
  getAgentState: (agentId: string) => AgentState | undefined;
  projectId: string;
}

const AgentStateContext = createContext<AgentStateContextValue | null>(null);

export function AgentStateProvider({
  children,
  agentStates,
  projectId,
}: {
  children: ReactNode;
  agentStates: AgentState[];
  projectId: string;
}) {
  const getAgentState = (agentId: string) => {
    return agentStates.find((s) => s.id === agentId);
  };

  return (
    <AgentStateContext.Provider value={{ agentStates, getAgentState, projectId }}>
      {children}
    </AgentStateContext.Provider>
  );
}

export function useAgentState(agentId?: string): AgentStateContextValue & { currentState?: AgentState } {
  const context = useContext(AgentStateContext);

  if (!context) {
    throw new Error('useAgentState must be used within AgentStateProvider');
  }

  return {
    ...context,
    currentState: agentId ? context.getAgentState(agentId) : undefined,
  };
}
