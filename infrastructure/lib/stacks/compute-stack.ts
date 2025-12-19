import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BaseLambda } from '../constructs/base-lambda';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for ComputeStack
 */
export interface ComputeStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
  /** Tickets DynamoDB table name */
  readonly ticketsTableName: string;
  /** Tickets DynamoDB table ARN */
  readonly ticketsTableArn: string;
  /** Conversations DynamoDB table name */
  readonly conversationsTableName: string;
  /** Conversations DynamoDB table ARN */
  readonly conversationsTableArn: string;
  /** Agent configuration DynamoDB table name (for AI Stack) */
  readonly agentConfigTableName?: string;
  /** Agent configuration DynamoDB table ARN (for AI Stack) */
  readonly agentConfigTableArn?: string;
  /** SNS topic ARN for alerts */
  readonly alertTopicArn?: string;
}

/**
 * ComputeStack provides Lambda functions for business logic:
 * - Agent Invoke Lambda for calling Strands agents
 * - Safe Actions Lambda for executing approved actions
 * 
 * Requirements: 4.1, 6.1, 6.2
 */
export class ComputeStack extends cdk.Stack {
  /** Agent Invoke Lambda function */
  public readonly agentInvokeFunction: lambda.Function;
  /** Safe Actions Lambda function */
  public readonly safeActionsFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;
    const removalPolicy = this.getRemovalPolicy(config.removalPolicy);

    // Create Agent Invoke Lambda
    const agentInvokeLambda = new BaseLambda(this, 'AgentInvoke', {
      functionName: `${namePrefix}-agent-invoke`,
      description: 'Invokes tenant Strands agent via Bedrock AgentCore',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../functions/agent-invoke/dist'),
      memorySize: config.lambda.aiMemorySize,
      timeout: cdk.Duration.seconds(config.lambda.aiTimeout),
      environment: {
        AGENT_CONFIG_TABLE_NAME: props.agentConfigTableName || '',
        CONVERSATIONS_TABLE_NAME: props.conversationsTableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      logRetentionDays: config.cloudwatch.logRetentionDays,
      removalPolicy,
    });

    this.agentInvokeFunction = agentInvokeLambda.function;

    // Grant permissions for Agent Invoke Lambda
    // Permission to read agent configuration
    if (props.agentConfigTableArn) {
      this.agentInvokeFunction.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['dynamodb:GetItem', 'dynamodb:Query'],
        resources: [props.agentConfigTableArn],
      }));
    }

    // Permission to invoke Bedrock agents
    this.agentInvokeFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeAgent',
        'bedrock:InvokeModel',
      ],
      resources: ['*'], // Bedrock agent ARNs are dynamic per tenant
    }));

    // Permission to access conversations table
    this.agentInvokeFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
      ],
      resources: [props.conversationsTableArn],
    }));

    // Create Safe Actions Lambda
    const safeActionsLambda = new BaseLambda(this, 'SafeActions', {
      functionName: `${namePrefix}-safe-actions`,
      description: 'Executes approved actions (create ticket, escalate, etc.)',
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../../functions/safe-actions/dist'),
      memorySize: config.lambda.standardMemorySize,
      timeout: cdk.Duration.seconds(config.lambda.standardTimeout),
      environment: {
        TICKETS_TABLE_NAME: props.ticketsTableName,
        ALERT_TOPIC_ARN: props.alertTopicArn || '',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      logRetentionDays: config.cloudwatch.logRetentionDays,
      removalPolicy,
    });

    this.safeActionsFunction = safeActionsLambda.function;

    // Grant permissions for Safe Actions Lambda
    // Permission to access tickets table
    this.safeActionsFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
      ],
      resources: [
        props.ticketsTableArn,
        `${props.ticketsTableArn}/index/*`,
      ],
    }));

    // Permission to publish to SNS topic
    if (props.alertTopicArn) {
      this.safeActionsFunction.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sns:Publish'],
        resources: [props.alertTopicArn],
      }));
    }

    // Create CloudFormation outputs
    new cdk.CfnOutput(this, 'AgentInvokeFunctionArn', {
      value: this.agentInvokeFunction.functionArn,
      description: 'Agent Invoke Lambda function ARN',
      exportName: `${namePrefix}-agent-invoke-function-arn`,
    });

    new cdk.CfnOutput(this, 'AgentInvokeFunctionName', {
      value: this.agentInvokeFunction.functionName,
      description: 'Agent Invoke Lambda function name',
      exportName: `${namePrefix}-agent-invoke-function-name`,
    });

    new cdk.CfnOutput(this, 'SafeActionsFunctionArn', {
      value: this.safeActionsFunction.functionArn,
      description: 'Safe Actions Lambda function ARN',
      exportName: `${namePrefix}-safe-actions-function-arn`,
    });

    new cdk.CfnOutput(this, 'SafeActionsFunctionName', {
      value: this.safeActionsFunction.functionName,
      description: 'Safe Actions Lambda function name',
      exportName: `${namePrefix}-safe-actions-function-name`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'FlowOps');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Stack', 'Compute');
  }

  /**
   * Convert config removal policy string to CDK RemovalPolicy
   */
  private getRemovalPolicy(policy: string): cdk.RemovalPolicy {
    switch (policy) {
      case 'DESTROY':
        return cdk.RemovalPolicy.DESTROY;
      case 'SNAPSHOT':
        return cdk.RemovalPolicy.SNAPSHOT;
      case 'RETAIN':
      default:
        return cdk.RemovalPolicy.RETAIN;
    }
  }
}
