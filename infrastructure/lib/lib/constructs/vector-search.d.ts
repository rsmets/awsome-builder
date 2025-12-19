import * as cdk from 'aws-cdk-lib';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
/**
 * Properties for VectorSearch construct
 */
export interface VectorSearchProps {
    /** Domain name for OpenSearch */
    readonly domainName: string;
    /** KMS key for encryption at rest */
    readonly encryptionKey: kms.IKey;
    /** Instance type for OpenSearch nodes */
    readonly instanceType?: string;
    /** Number of data nodes */
    readonly instanceCount?: number;
    /** EBS volume size in GB */
    readonly volumeSize?: number;
    /** Enable dedicated master nodes */
    readonly dedicatedMasterEnabled?: boolean;
    /** Dedicated master instance type */
    readonly dedicatedMasterType?: string;
    /** Number of dedicated master nodes */
    readonly dedicatedMasterCount?: number;
    /** Enable multi-AZ deployment */
    readonly zoneAwarenessEnabled?: boolean;
    /** Number of availability zones (2 or 3) */
    readonly availabilityZoneCount?: number;
    /** VPC for deployment (optional - if not provided, uses public access) */
    readonly vpc?: ec2.IVpc;
    /** VPC subnets for deployment */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /** Removal policy for the domain */
    readonly removalPolicy?: cdk.RemovalPolicy;
}
/**
 * VectorSearch construct creates an OpenSearch domain configured for vector search:
 * - Engine version supporting k-NN (OpenSearch 2.x)
 * - Encryption at rest with KMS
 * - Fine-grained access control enabled
 * - Appropriate instance types and shard configuration
 *
 * Requirements: 2.3, 3.4 - Query OpenSearch with vector search capabilities
 */
export declare class VectorSearch extends Construct {
    /** The OpenSearch domain */
    readonly domain: opensearch.Domain;
    /** The domain ARN */
    readonly domainArn: string;
    /** The domain endpoint */
    readonly domainEndpoint: string;
    /** The domain name */
    readonly domainName: string;
    constructor(scope: Construct, id: string, props: VectorSearchProps);
    /**
     * Creates a master user IAM role for fine-grained access control
     */
    private createMasterUserRole;
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
     * Grant index read permissions to a principal for a specific index pattern
     */
    grantIndexRead(grantee: iam.IGrantable, indexPattern: string): iam.Grant;
    /**
     * Grant index read/write permissions to a principal for a specific index pattern
     */
    grantIndexReadWrite(grantee: iam.IGrantable, indexPattern: string): iam.Grant;
}
//# sourceMappingURL=vector-search.d.ts.map