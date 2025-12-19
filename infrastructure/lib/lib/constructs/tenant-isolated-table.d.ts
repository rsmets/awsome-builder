import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Global Secondary Index configuration
 */
export interface GSIConfig {
    /** Index name */
    readonly indexName: string;
    /** Partition key for the GSI */
    readonly partitionKey: dynamodb.Attribute;
    /** Sort key for the GSI (optional) */
    readonly sortKey?: dynamodb.Attribute;
    /** Projection type (default: ALL) */
    readonly projectionType?: dynamodb.ProjectionType;
    /** Non-key attributes to project (for INCLUDE projection) */
    readonly nonKeyAttributes?: string[];
}
/**
 * Properties for TenantIsolatedTable construct
 */
export interface TenantIsolatedTableProps {
    /** Table name */
    readonly tableName: string;
    /** Partition key for the table */
    readonly partitionKey: dynamodb.Attribute;
    /** Sort key for the table (optional) */
    readonly sortKey?: dynamodb.Attribute;
    /** KMS key for encryption at rest */
    readonly encryptionKey: kms.IKey;
    /** Enable point-in-time recovery (default: true) */
    readonly pointInTimeRecovery?: boolean;
    /** Billing mode (default: PAY_PER_REQUEST) */
    readonly billingMode?: dynamodb.BillingMode;
    /** Global Secondary Indexes */
    readonly globalSecondaryIndexes?: GSIConfig[];
    /** Removal policy for the table */
    readonly removalPolicy?: cdk.RemovalPolicy;
    /** Enable DynamoDB Streams */
    readonly stream?: dynamodb.StreamViewType;
    /** Time to live attribute name */
    readonly timeToLiveAttribute?: string;
}
/**
 * TenantIsolatedTable construct creates a DynamoDB table with:
 * - On-demand capacity mode for cost optimization
 * - Point-in-time recovery for data protection
 * - Encryption at rest with KMS customer managed key
 * - Tenant isolation via partition key design
 *
 * Requirements: 3.1, 3.2, 5.2 - Store data in DynamoDB with tenant isolation and encryption
 */
export declare class TenantIsolatedTable extends Construct {
    /** The DynamoDB table */
    readonly table: dynamodb.Table;
    /** The table ARN */
    readonly tableArn: string;
    /** The table name */
    readonly tableName: string;
    /** The table stream ARN (if streams enabled) */
    readonly tableStreamArn?: string;
    constructor(scope: Construct, id: string, props: TenantIsolatedTableProps);
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant stream read permissions to a principal
     */
    grantStreamRead(grantee: iam.IGrantable): iam.Grant;
    /**
     * Create a tenant-scoped IAM policy statement for read access
     * This enforces tenant isolation at the IAM level
     */
    createTenantScopedReadPolicy(tenantIdPlaceholder?: string): iam.PolicyStatement;
    /**
     * Create a tenant-scoped IAM policy statement for write access
     * This enforces tenant isolation at the IAM level
     */
    createTenantScopedWritePolicy(tenantIdPlaceholder?: string): iam.PolicyStatement;
}
//# sourceMappingURL=tenant-isolated-table.d.ts.map