"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devConfig = void 0;
/**
 * Development environment configuration
 * Optimized for cost and fast iteration
 */
exports.devConfig = {
    environment: 'dev',
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
        pointInTimeRecovery: false,
        billingMode: 'PAY_PER_REQUEST',
    },
    opensearch: {
        instanceType: 't3.small.search',
        instanceCount: 1,
        volumeSize: 10,
        dedicatedMasterEnabled: false,
        zoneAwarenessEnabled: false,
    },
    cognito: {
        passwordMinLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        mfaEnabled: false,
    },
    apiGateway: {
        rateLimit: 100,
        burstLimit: 200,
        throttlingEnabled: true,
    },
    cloudwatch: {
        logRetentionDays: 7,
        detailedMetrics: false,
    },
    bedrock: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        embeddingModelId: 'amazon.titan-embed-text-v2:0',
    },
    removalPolicy: 'DESTROY',
};
//# sourceMappingURL=dev.js.map