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
export class SecureBucket extends Construct {
  /** The S3 bucket */
  public readonly bucket: s3.Bucket;
  /** The bucket ARN */
  public readonly bucketArn: string;
  /** The bucket name */
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    const versioned = props.versioned ?? true;
    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
    const autoDeleteObjects = props.autoDeleteObjects ?? (removalPolicy === cdk.RemovalPolicy.DESTROY);
    const eventBridgeEnabled = props.eventBridgeEnabled ?? false;

    // Default lifecycle rules for cost optimization
    const defaultLifecycleRules: s3.LifecycleRule[] = [
      {
        id: 'TransitionToIntelligentTiering',
        enabled: true,
        transitions: [
          {
            storageClass: s3.StorageClass.INTELLIGENT_TIERING,
            transitionAfter: cdk.Duration.days(30),
          },
        ],
      },
      {
        id: 'ExpireNoncurrentVersions',
        enabled: true,
        noncurrentVersionExpiration: cdk.Duration.days(90),
        noncurrentVersionsToRetain: 3,
      },
      {
        id: 'AbortIncompleteMultipartUploads',
        enabled: true,
        abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
      },
    ];

    const lifecycleRules = props.lifecycleRules ?? defaultLifecycleRules;

    // Create the S3 bucket with security best practices
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      versioned,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      bucketKeyEnabled: true, // Reduces KMS costs
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      eventBridgeEnabled,
      lifecycleRules,
      removalPolicy,
      autoDeleteObjects,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    });

    // Add bucket policy to enforce SSL
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    this.bucketArn = this.bucket.bucketArn;
    this.bucketName = this.bucket.bucketName;
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantRead(grantee);
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantReadWrite(grantee);
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantWrite(grantee);
  }

  /**
   * Grant delete permissions to a principal
   */
  public grantDelete(grantee: iam.IGrantable): iam.Grant {
    return this.bucket.grantDelete(grantee);
  }
}
