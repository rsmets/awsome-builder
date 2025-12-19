import { FlowOpsConfig } from './index';

/**
 * Staging environment configuration
 * Production-like settings for testing
 */
export const stagingConfig: FlowOpsConfig = {
  environment: 'staging',
  region: 'us-east-1',

  lambda: {
    aiMemorySize: 1024,
    aiTimeout: 60,
    standardMemorySize: 256,
    standardTimeout: 15,
    ingestionMemorySize: 1024,
    ingestionTimeout: 300,
  },

  dynamodb: {
    pointInTimeRecovery: true,
    billingMode: 'PAY_PER_REQUEST',
  },

  opensearch: {
    instanceType: 'm6g.large.search',
    instanceCount: 2,
    volumeSize: 50,
    dedicatedMasterEnabled: false,
    zoneAwarenessEnabled: true,
  },

  cognito: {
    passwordMinLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: true,
    mfaEnabled: true,
  },

  apiGateway: {
    rateLimit: 500,
    burstLimit: 1000,
    throttlingEnabled: true,
  },

  cloudwatch: {
    logRetentionDays: 30,
    detailedMetrics: true,
  },

  bedrock: {
    modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
    embeddingModelId: 'amazon.titan-embed-text-v2:0',
  },

  removalPolicy: 'RETAIN',
};
