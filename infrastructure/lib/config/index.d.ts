export type Environment = 'dev' | 'staging' | 'prod';
/**
 * Configuration interface for FlowOps infrastructure
 */
export interface FlowOpsConfig {
    /** Environment name */
    environment: Environment;
    /** AWS region for deployment */
    region: string;
    /** Configuration for Lambda functions */
    lambda: {
        /** Memory size for AI/chat Lambda functions (MB) */
        aiMemorySize: number;
        /** Timeout for AI/chat Lambda functions (seconds) */
        aiTimeout: number;
        /** Memory size for standard Lambda functions (MB) */
        standardMemorySize: number;
        /** Timeout for standard Lambda functions (seconds) */
        standardTimeout: number;
        /** Memory size for document ingestion Lambda (MB) */
        ingestionMemorySize: number;
        /** Timeout for document ingestion Lambda (seconds) */
        ingestionTimeout: number;
    };
    /** Configuration for DynamoDB tables */
    dynamodb: {
        /** Enable point-in-time recovery */
        pointInTimeRecovery: boolean;
        /** Billing mode: PAY_PER_REQUEST or PROVISIONED */
        billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
    };
    /** Configuration for OpenSearch */
    opensearch: {
        /** Instance type for OpenSearch nodes */
        instanceType: string;
        /** Number of data nodes */
        instanceCount: number;
        /** EBS volume size in GB */
        volumeSize: number;
        /** Enable dedicated master nodes */
        dedicatedMasterEnabled: boolean;
        /** Enable multi-AZ deployment */
        zoneAwarenessEnabled: boolean;
    };
    /** Configuration for Cognito */
    cognito: {
        /** Minimum password length */
        passwordMinLength: number;
        /** Require lowercase in password */
        requireLowercase: boolean;
        /** Require uppercase in password */
        requireUppercase: boolean;
        /** Require digits in password */
        requireDigits: boolean;
        /** Require symbols in password */
        requireSymbols: boolean;
        /** Enable MFA */
        mfaEnabled: boolean;
    };
    /** Configuration for API Gateway */
    apiGateway: {
        /** Rate limit (requests per second) */
        rateLimit: number;
        /** Burst limit */
        burstLimit: number;
        /** Enable throttling */
        throttlingEnabled: boolean;
    };
    /** Configuration for CloudWatch */
    cloudwatch: {
        /** Log retention in days */
        logRetentionDays: number;
        /** Enable detailed metrics */
        detailedMetrics: boolean;
    };
    /** Configuration for Bedrock */
    bedrock: {
        /** Model ID for text generation */
        modelId: string;
        /** Model ID for embeddings */
        embeddingModelId: string;
    };
    /** Removal policy for resources */
    removalPolicy: 'DESTROY' | 'RETAIN' | 'SNAPSHOT';
}
/**
 * Get configuration for the specified environment
 */
export declare function getConfig(environment: Environment): FlowOpsConfig;
export { devConfig } from './dev';
export { stagingConfig } from './staging';
export { prodConfig } from './prod';
//# sourceMappingURL=index.d.ts.map