#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig, Environment } from '../config';
import { 
  FoundationStack, 
  DataStack, 
  ComputeStack, 
  AIStack, 
  APIStack,
  OrchestrationStack,
  ObservabilityStack,
} from '../lib/stacks';
import { FlowOpsValidationAspect } from '../lib/constructs/validation-aspects';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const envName = (app.node.tryGetContext('env') as Environment) || 'dev';
const config = getConfig(envName);

// Define AWS environment for stack deployment
export const awsEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

// Tags applied to all resources
const tags: Record<string, string> = {
  Project: 'FlowOps',
  Environment: envName,
  ManagedBy: 'CDK',
};

// Apply tags to all resources in the app
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

// Export config for use by stacks
export { config, envName };

// 1. Foundation Stack - Security and Identity
const foundationStack = new FoundationStack(app, `FlowOps-Foundation-${envName}`, {
  env: awsEnv,
  config,
  description: 'FlowOps Foundation Stack - KMS keys and Cognito authentication',
});

// 2. Data Stack - Storage Layer
const dataStack = new DataStack(app, `FlowOps-Data-${envName}`, {
  env: awsEnv,
  config,
  kmsKey: foundationStack.kmsKey.key,
  description: 'FlowOps Data Stack - S3, DynamoDB, and OpenSearch',
});
dataStack.addDependency(foundationStack);

// 3. Orchestration Stack - Events and Workflows
const orchestrationStack = new OrchestrationStack(app, `FlowOps-Orchestration-${envName}`, {
  env: awsEnv,
  config,
  kmsKey: foundationStack.kmsKey.key,
  description: 'FlowOps Orchestration Stack - EventBridge and SNS',
});
orchestrationStack.addDependency(foundationStack);

// 4. Compute Stack - Lambda Functions
const computeStack = new ComputeStack(app, `FlowOps-Compute-${envName}`, {
  env: awsEnv,
  config,
  ticketsTableName: dataStack.ticketsTable.tableName,
  ticketsTableArn: dataStack.ticketsTable.tableArn,
  conversationsTableName: dataStack.conversationsTable.tableName,
  conversationsTableArn: dataStack.conversationsTable.tableArn,
  alertTopicArn: orchestrationStack.alertTopic.topicArn,
  description: 'FlowOps Compute Stack - Lambda functions',
});
computeStack.addDependency(dataStack);
computeStack.addDependency(orchestrationStack);

// 5. AI Stack - Bedrock Configuration
const aiStack = new AIStack(app, `FlowOps-AI-${envName}`, {
  env: awsEnv,
  config,
  kmsKeyArn: foundationStack.kmsKeyArn,
  description: 'FlowOps AI Stack - Bedrock models and guardrails',
});
aiStack.addDependency(foundationStack);

// 6. API Stack - API Gateway
const apiStack = new APIStack(app, `FlowOps-API-${envName}`, {
  env: awsEnv,
  config,
  userPool: foundationStack.cognitoAuth.userPool,
  agentInvokeFunction: computeStack.agentInvokeFunction,
  safeActionsFunction: computeStack.safeActionsFunction,
  description: 'FlowOps API Stack - REST and WebSocket APIs',
});
apiStack.addDependency(foundationStack);
apiStack.addDependency(computeStack);

// 7. Observability Stack - Monitoring and Alarms
const observabilityStack = new ObservabilityStack(app, `FlowOps-Observability-${envName}`, {
  env: awsEnv,
  config,
  alertTopic: orchestrationStack.alertTopic,
  agentInvokeFunction: computeStack.agentInvokeFunction,
  safeActionsFunction: computeStack.safeActionsFunction,
  restApiId: apiStack.restApi.restApiId,
  openSearchDomainName: dataStack.openSearchDomain.domainName,
  description: 'FlowOps Observability Stack - CloudWatch dashboards and alarms',
});
observabilityStack.addDependency(computeStack);
observabilityStack.addDependency(apiStack);
observabilityStack.addDependency(orchestrationStack);

// Apply validation aspects to all stacks
cdk.Aspects.of(app).add(new FlowOpsValidationAspect(envName, ['Project', 'Environment', 'Stack']));

app.synth();
