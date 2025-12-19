export interface AgentTool {
  name: string;
  description: string;
  enabled: boolean;
  requiresConfirmation: boolean; // For safe actions
}

export interface AgentConfig {
  tenantId: string;
  agentId: string;
  agentArn: string;
  agentAliasId: string;
  agentType: 'single' | 'swarm';
  tools: AgentTool[];
  guardrailId?: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 2: Swarm configuration
export interface SwarmConfig {
  tenantId: string;
  orchestratorAgentId: string;
  specializedAgents: {
    knowledge?: string; // Agent ID for KB queries
    scheduling?: string; // Agent ID for scheduling
    messaging?: string; // Agent ID for notifications
  };
}
