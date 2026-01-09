import type { Task } from '../models/index.js';
import type { Agent } from './types.js';
import { DefaultAgent } from './default-agent.js';

/**
 * AgentRegistry manages available agents and selects the appropriate agent for each task
 * This provides a clean extension point for adding new agent types
 */
export class AgentRegistry {
  private agents: Agent[];
  private defaultAgent: Agent;

  constructor() {
    this.defaultAgent = new DefaultAgent();
    this.agents = [this.defaultAgent];
  }

  /**
   * Register a new agent
   * Agents are checked in registration order
   */
  registerAgent(agent: Agent): void {
    this.agents.unshift(agent); // Add to front so new agents are checked first
  }

  /**
   * Select the best agent for a given task
   * Returns the first agent that can handle the task, or the default agent
   */
  selectAgent(task: Task): Agent {
    for (const agent of this.agents) {
      if (agent.canHandle(task)) {
        return agent;
      }
    }

    // Fallback to default agent (though it should always match)
    return this.defaultAgent;
  }

  /**
   * Get all registered agents
   */
  getAgents(): ReadonlyArray<Agent> {
    return [...this.agents];
  }
}
