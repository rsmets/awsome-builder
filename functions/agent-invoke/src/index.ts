import { 
  BedrockAgentRuntimeClient, 
  InvokeAgentCommand,
  InvokeAgentCommandInput,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const bedrockClient = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

const AGENT_CONFIG_TABLE = process.env.AGENT_CONFIG_TABLE_NAME!;

interface AgentConfig {
  tenantId: string;
  agentId: string;
  agentArn: string;
  agentAliasId: string;
  tools: Array<{
    name: string;
    enabled: boolean;
  }>;
}

interface AgentInvokeEvent {
  tenantId: string;
  sessionId: string;
  inputText: string;
  enableTrace?: boolean;
}

/**
 * Agent Invoke Lambda
 * 
 * Invokes tenant's Strands agent via Bedrock AgentCore
 * 
 * Requirements: 2.5.2, 4.1
 */
export async function handler(event: AgentInvokeEvent) {
  console.log('Agent Invoke Lambda triggered', { tenantId: event.tenantId, sessionId: event.sessionId });

  try {
    // 1. Extract tenant ID from the authenticated request
    const tenantId = event.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // 2. Look up tenant's agent configuration from DynamoDB
    const agentConfig = await getAgentConfig(tenantId);
    if (!agentConfig) {
      throw new Error(`No agent configured for tenant: ${tenantId}`);
    }

    console.log('Found agent configuration', { 
      agentId: agentConfig.agentId, 
      agentAliasId: agentConfig.agentAliasId 
    });

    // 3. Invoke the Strands agent via Bedrock AgentCore API
    const input: InvokeAgentCommandInput = {
      agentId: agentConfig.agentId,
      agentAliasId: agentConfig.agentAliasId,
      sessionId: event.sessionId,
      inputText: event.inputText,
      enableTrace: event.enableTrace || false,
    };

    const command = new InvokeAgentCommand(input);
    const response = await bedrockClient.send(command);

    // 4. Process and return the agent's response
    let agentResponse = '';
    
    if (response.completion) {
      // Stream response chunks
      for await (const chunk of response.completion) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          agentResponse += text;
        }
      }
    }

    console.log('Agent invocation complete', { responseLength: agentResponse.length });

    return {
      statusCode: 200,
      body: JSON.stringify({
        tenantId,
        sessionId: event.sessionId,
        response: agentResponse,
        agentId: agentConfig.agentId,
      }),
    };
  } catch (error) {
    console.error('Error invoking agent', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to invoke agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Retrieve agent configuration for a tenant from DynamoDB
 */
async function getAgentConfig(tenantId: string): Promise<AgentConfig | null> {
  try {
    const command = new GetCommand({
      TableName: AGENT_CONFIG_TABLE,
      Key: { tenantId },
    });

    const response = await dynamoClient.send(command);
    
    if (!response.Item) {
      return null;
    }

    return response.Item as AgentConfig;
  } catch (error) {
    console.error('Error fetching agent config', error);
    throw error;
  }
}
