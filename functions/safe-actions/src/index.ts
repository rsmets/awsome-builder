import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

const TICKETS_TABLE = process.env.TICKETS_TABLE_NAME!;
const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN!;

interface SafeActionEvent {
  tenantId: string;
  actionType: 'create_ticket' | 'escalate_to_human' | 'request_logs';
  payload: Record<string, any>;
  userId?: string;
}

/**
 * Safe Actions Lambda
 * 
 * Executes approved actions that require confirmation:
 * - Create support ticket
 * - Escalate to human agent
 * - Request diagnostic logs
 * 
 * Requirements: 4.5
 */
export async function handler(event: SafeActionEvent) {
  console.log('Safe Actions Lambda triggered', { 
    tenantId: event.tenantId, 
    actionType: event.actionType 
  });

  try {
    const tenantId = event.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    let result;
    switch (event.actionType) {
      case 'create_ticket':
        result = await createTicket(tenantId, event.payload);
        break;
      case 'escalate_to_human':
        result = await escalateToHuman(tenantId, event.payload);
        break;
      case 'request_logs':
        result = await requestLogs(tenantId, event.payload);
        break;
      default:
        throw new Error(`Unknown action type: ${event.actionType}`);
    }

    console.log('Action executed successfully', { actionType: event.actionType, result });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        actionType: event.actionType,
        result,
      }),
    };
  } catch (error) {
    console.error('Error executing safe action', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Failed to execute action',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Create a support ticket
 */
async function createTicket(tenantId: string, payload: Record<string, any>) {
  const ticketId = randomUUID();
  const now = new Date().toISOString();

  const ticket = {
    tenantId,
    ticketId,
    status: 'open',
    priority: payload.priority || 'medium',
    subject: payload.subject || 'New support request',
    description: payload.description || '',
    category: payload.category || 'general',
    sentiment: payload.sentiment || 'neutral',
    severity: payload.severity || 3,
    slaRisk: false,
    createdAt: now,
    updatedAt: now,
    conversationIds: payload.conversationId ? [payload.conversationId] : [],
  };

  const command = new PutCommand({
    TableName: TICKETS_TABLE,
    Item: ticket,
  });

  await dynamoClient.send(command);

  console.log('Ticket created', { ticketId, tenantId });

  return { ticketId, status: 'created' };
}

/**
 * Escalate to human agent
 */
async function escalateToHuman(tenantId: string, payload: Record<string, any>) {
  const ticketId = payload.ticketId;
  
  if (!ticketId) {
    throw new Error('Ticket ID is required for escalation');
  }

  // Update ticket status to indicate human escalation
  const updateCommand = new UpdateCommand({
    TableName: TICKETS_TABLE,
    Key: { tenantId, ticketId },
    UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #slaRisk = :slaRisk',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
      '#slaRisk': 'slaRisk',
    },
    ExpressionAttributeValues: {
      ':status': 'escalated',
      ':updatedAt': new Date().toISOString(),
      ':slaRisk': true,
    },
  });

  await dynamoClient.send(updateCommand);

  // Send SNS notification for escalation
  const message = {
    tenantId,
    ticketId,
    action: 'escalate_to_human',
    reason: payload.reason || 'Customer requested human assistance',
    priority: 'high',
    timestamp: new Date().toISOString(),
  };

  const publishCommand = new PublishCommand({
    TopicArn: ALERT_TOPIC_ARN,
    Subject: `[FlowOps] Escalation Required - Tenant ${tenantId}`,
    Message: JSON.stringify(message, null, 2),
    MessageAttributes: {
      tenantId: { DataType: 'String', StringValue: tenantId },
      actionType: { DataType: 'String', StringValue: 'escalate_to_human' },
      priority: { DataType: 'String', StringValue: 'high' },
    },
  });

  await snsClient.send(publishCommand);

  console.log('Escalation notification sent', { ticketId, tenantId });

  return { ticketId, status: 'escalated' };
}

/**
 * Request diagnostic logs
 */
async function requestLogs(tenantId: string, payload: Record<string, any>) {
  const ticketId = payload.ticketId;
  
  if (!ticketId) {
    throw new Error('Ticket ID is required for log request');
  }

  // Send SNS notification for log collection
  const message = {
    tenantId,
    ticketId,
    action: 'request_logs',
    logType: payload.logType || 'application',
    timeRange: payload.timeRange || '1h',
    timestamp: new Date().toISOString(),
  };

  const publishCommand = new PublishCommand({
    TopicArn: ALERT_TOPIC_ARN,
    Subject: `[FlowOps] Log Request - Tenant ${tenantId}`,
    Message: JSON.stringify(message, null, 2),
    MessageAttributes: {
      tenantId: { DataType: 'String', StringValue: tenantId },
      actionType: { DataType: 'String', StringValue: 'request_logs' },
    },
  });

  await snsClient.send(publishCommand);

  console.log('Log request notification sent', { ticketId, tenantId });

  return { ticketId, status: 'logs_requested' };
}
