import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecureBucket } from '../constructs/secure-bucket';
import { FlowOpsTables } from '../constructs/flowops-tables';
import { VectorSearch } from '../constructs/vector-search';
import { FlowOpsConfig } from '../../config';
/**
 * Properties for DataStack
 */
export interface DataStackProps extends cdk.StackProps {
    /** FlowOps configuration */
    readonly config: FlowOpsConfig;
    /** KMS key ARN from Foundation Stack */
    readonly kmsKeyArn: string;
}
/**
 * DataStack provides all persistent data storage infrastructure:
 * - S3 bucket for document storage with versioning
 * - DynamoDB tables for tickets, conversations, and metadata
 * - OpenSearch domain for vector search
 *
 * Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export declare class DataStack extends cdk.Stack {
    /** Documents S3 bucket */
    readonly documentsBucket: SecureBucket;
    /** FlowOps DynamoDB tables */
    readonly tables: FlowOpsTables;
    /** OpenSearch vector search domain */
    readonly vectorSearch: VectorSearch;
    /** Documents bucket ARN */
    readonly documentsBucketArn: string;
    /** Documents bucket name */
    readonly documentsBucketName: string;
    /** Tickets table ARN */
    readonly ticketsTableArn: string;
    /** Tickets table name */
    readonly ticketsTableName: string;
    /** Conversations table ARN */
    readonly conversationsTableArn: string;
    /** Conversations table name */
    readonly conversationsTableName: string;
    /** Metadata table ARN */
    readonly metadataTableArn: string;
    /** Metadata table name */
    readonly metadataTableName: string;
    /** OpenSearch domain ARN */
    readonly openSearchDomainArn: string;
    /** OpenSearch domain endpoint */
    readonly openSearchEndpoint: string;
    constructor(scope: Construct, id: string, props: DataStackProps);
    /**
     * Create CloudFormation outputs for cross-stack references
     */
    private createOutputs;
    /**
     * Convert config removal policy string to CDK RemovalPolicy
     */
    private getRemovalPolicy;
}
//# sourceMappingURL=data-stack.d.ts.map