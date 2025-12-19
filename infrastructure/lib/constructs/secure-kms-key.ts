import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for SecureKmsKey construct
 */
export interface SecureKmsKeyProps {
  /** Alias name for the KMS key (without 'alias/' prefix) */
  readonly aliasName: string;
  /** Description for the KMS key */
  readonly description?: string;
  /** Enable automatic key rotation (default: true) */
  readonly enableKeyRotation?: boolean;
  /** Removal policy for the key */
  readonly removalPolicy?: cdk.RemovalPolicy;
  /** Additional principals that can use the key */
  readonly additionalPrincipals?: iam.IPrincipal[];
}

/**
 * SecureKmsKey construct creates a customer-managed KMS key with:
 * - Automatic key rotation enabled
 * - Key policy configured for cross-stack access
 * - Alias for easy reference
 * 
 * Requirements: 5.2 - Encrypt all data at rest using AWS KMS customer managed keys
 */
export class SecureKmsKey extends Construct {
  /** The KMS key */
  public readonly key: kms.Key;
  /** The key alias */
  public readonly alias: kms.Alias;
  /** The key ARN */
  public readonly keyArn: string;
  /** The key ID */
  public readonly keyId: string;

  constructor(scope: Construct, id: string, props: SecureKmsKeyProps) {
    super(scope, id);

    const enableKeyRotation = props.enableKeyRotation ?? true;
    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;

    // Create the KMS key with rotation enabled
    this.key = new kms.Key(this, 'Key', {
      description: props.description ?? `FlowOps encryption key: ${props.aliasName}`,
      enableKeyRotation,
      removalPolicy,
      // Key policy allows the account root and can be extended
      policy: this.createKeyPolicy(props.additionalPrincipals),
    });

    // Create an alias for easy reference
    this.alias = new kms.Alias(this, 'Alias', {
      aliasName: `alias/${props.aliasName}`,
      targetKey: this.key,
    });

    this.keyArn = this.key.keyArn;
    this.keyId = this.key.keyId;
  }

  /**
   * Creates the key policy for cross-stack access
   */
  private createKeyPolicy(additionalPrincipals?: iam.IPrincipal[]): iam.PolicyDocument {
    const statements: iam.PolicyStatement[] = [
      // Allow account root full access (required for key administration)
      new iam.PolicyStatement({
        sid: 'AllowRootAccess',
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountRootPrincipal()],
        actions: ['kms:*'],
        resources: ['*'],
      }),
      // Allow CloudWatch Logs to use the key
      new iam.PolicyStatement({
        sid: 'AllowCloudWatchLogs',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('logs.amazonaws.com')],
        actions: [
          'kms:Encrypt',
          'kms:Decrypt',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
          'kms:DescribeKey',
        ],
        resources: ['*'],
        conditions: {
          ArnLike: {
            'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:*:${cdk.Stack.of(this).account}:*`,
          },
        },
      }),
    ];

    // Add additional principals if provided
    if (additionalPrincipals && additionalPrincipals.length > 0) {
      statements.push(
        new iam.PolicyStatement({
          sid: 'AllowAdditionalPrincipals',
          effect: iam.Effect.ALLOW,
          principals: additionalPrincipals,
          actions: [
            'kms:Encrypt',
            'kms:Decrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:DescribeKey',
          ],
          resources: ['*'],
        })
      );
    }

    return new iam.PolicyDocument({ statements });
  }

  /**
   * Grant encrypt/decrypt permissions to a principal
   */
  public grantEncryptDecrypt(grantee: iam.IGrantable): iam.Grant {
    return this.key.grantEncryptDecrypt(grantee);
  }

  /**
   * Grant read (decrypt) permissions to a principal
   */
  public grantDecrypt(grantee: iam.IGrantable): iam.Grant {
    return this.key.grantDecrypt(grantee);
  }
}
