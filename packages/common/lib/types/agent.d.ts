export interface AgentTool {
    name: string;
    description: string;
    enabled: boolean;
    requiresConfirmation: boolean;
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
export interface SwarmConfig {
    tenantId: string;
    orchestratorAgentId: string;
    specializedAgents: {
        knowledge?: string;
        scheduling?: string;
        messaging?: string;
    };
}
//# sourceMappingURL=agent.d.ts.map