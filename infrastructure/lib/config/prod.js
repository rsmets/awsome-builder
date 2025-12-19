"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodConfig = void 0;
/**
 * Production environment configuration
 * Optimized for reliability, security, and performance
 */
exports.prodConfig = {
    environment: 'prod',
    region: 'us-east-1',
    lambda: {
        aiMemorySize: 1024,
        aiTimeout: 60,
        standardMemorySize: 512,
        standardTimeout: 15,
        ingestionMemorySize: 1024,
        ingestionTimeout: 300,
    },
    dynamodb: {
        pointInTimeRecovery: true,
        billingMode: 'PAY_PER_REQUEST',
    },
    opensearch: {
        instanceType: 'm6g.xlarge.search',
        instanceCount: 3,
        volumeSize: 100,
        dedicatedMasterEnabled: true,
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
        rateLimit: 1000,
        burstLimit: 2000,
        throttlingEnabled: true,
    },
    cloudwatch: {
        logRetentionDays: 90,
        detailedMetrics: true,
    },
    bedrock: {
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        embeddingModelId: 'amazon.titan-embed-text-v2:0',
    },
    removalPolicy: 'RETAIN',
};
//# sourceMappingURL=prod.js.map