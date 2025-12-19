import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Properties for SecureBucket construct
 */
export interface SecureBucketProps {
    /** Bucket name (optional - will be auto-generated if not provided) */
    readonly bucketName?: string;
    /** KMS key for server-side encryption */
    readonly encryptionKey: kms.IKey;
    /** Enable versioning (default: true) */
    readonly versioned?: boolean;
    /** Enable EventBridge notifications (default: false) */
    readonly eventBridgeEnabled?: boolean;
    /** Lifecycle rules for cost optimization */
    readonly lifecycleRules?: s3.LifecycleRule[];
    /** Removal policy for the bucket */
    readonly removalPolicy?: cdk.RemovalPolicy;
    /** Auto delete objects when bucket is deleted (only for DESTROY policy) */
    readonly autoDeleteObjects?: boolean;
}
/**
 * SecureBucket construct creates an S3 bucket with:
 * - Versioning enabled for document history
 * - Server-side encryption with KMS customer managed key
 * - Lifecycle policies for cost optimization
 * - Public access blocked
 * - SSL-only access enforced
 *
 * Requirements: 2.1, 3.3 - Store documents in S3 with versioning enabled
 */
export declare class SecureBucket extends Construct {
    /** The S3 bucket */
    readonly bucket: s3.Bucket;
    /** The bucket ARN */
    readonly bucketArn: string;
    /** The bucket name */
    readonly bucketName: string;
    constructor(scope: Construct, id: string, props: SecureBucketProps);
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
     * Grant delete permissions to a principal
     */
    grantDelete(grantee: iam.IGrantable): iam.Grant;
}
//# sourceMappingURL=secure-bucket.d.ts.map