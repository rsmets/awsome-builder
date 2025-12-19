import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SecureKmsKey } from '../constructs/secure-kms-key';
import { CognitoAuth } from '../constructs/cognito-auth';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for FoundationStack
 */
export interface FoundationStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
}

/**
 * FoundationStack provides core security and identity infrastructure:
 * - KMS customer managed key for all data encryption
 * - Cognito User Pool for authentication
 * - Cognito Identity Pool for AWS credentials
 * - User groups for role-based access control
 * 
 * Requirements: 5.1, 5.2
 */
export class FoundationStack extends cdk.Stack {
  /** The KMS key construct */
  public readonly kmsKey: SecureKmsKey;
  /** The Cognito auth construct */
  public readonly cognitoAuth: CognitoAuth;

  // Exported values for cross-stack references
  /** KMS Key ARN */
  public readonly kmsKeyArn: string;
  /** KMS Key ID */
  public readonly kmsKeyId: string;
  /** Cognito User Pool ID */
  public readonly userPoolId: string;
  /** Cognito User Pool ARN */
  public readonly userPoolArn: string;
  /** Cognito User Pool Client ID */
  public readonly userPoolClientId: string;
  /** Cognito Identity Pool ID */
  public readonly identityPoolId: string;

  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;
    const removalPolicy = this.getRemovalPolicy(config.removalPolicy);

    // Create KMS customer managed key
    this.kmsKey = new SecureKmsKey(this, 'EncryptionKey', {
      aliasName: `${namePrefix}-encryption-key`,
      description: `FlowOps ${config.environment} encryption key for all data at rest`,
      enableKeyRotation: true,
      removalPolicy,
    });

    // Create Cognito User Pool and Identity Pool
    this.cognitoAuth = new CognitoAuth(this, 'Auth', {
      namePrefix,
      passwordPolicy: {
        minLength: config.cognito.passwordMinLength,
        requireLowercase: config.cognito.requireLowercase,
        requireUppercase: config.cognito.requireUppercase,
        requireDigits: config.cognito.requireDigits,
        requireSymbols: config.cognito.requireSymbols,
      },
      mfaEnabled: config.cognito.mfaEnabled,
      removalPolicy,
    });

    // Store exported values
    this.kmsKeyArn = this.kmsKey.keyArn;
    this.kmsKeyId = this.kmsKey.keyId;
    this.userPoolId = this.cognitoAuth.userPoolId;
    this.userPoolArn = this.cognitoAuth.userPoolArn;
    this.userPoolClientId = this.cognitoAuth.userPoolClientId;
    this.identityPoolId = this.cognitoAuth.identityPoolId;

    // Create CloudFormation outputs for cross-stack references
    new cdk.CfnOutput(this, 'KmsKeyArn', {
      value: this.kmsKeyArn,
      description: 'KMS Key ARN for encryption',
      exportName: `${namePrefix}-kms-key-arn`,
    });

    new cdk.CfnOutput(this, 'KmsKeyId', {
      value: this.kmsKeyId,
      description: 'KMS Key ID',
      exportName: `${namePrefix}-kms-key-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${namePrefix}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${namePrefix}-user-pool-arn`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${namePrefix}-user-pool-client-id`,
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPoolId,
      description: 'Cognito Identity Pool ID',
      exportName: `${namePrefix}-identity-pool-id`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'FlowOps');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Stack', 'Foundation');
  }

  /**
   * Convert config removal policy string to CDK RemovalPolicy
   */
  private getRemovalPolicy(policy: string): cdk.RemovalPolicy {
    switch (policy) {
      case 'DESTROY':
        return cdk.RemovalPolicy.DESTROY;
      case 'SNAPSHOT':
        return cdk.RemovalPolicy.SNAPSHOT;
      case 'RETAIN':
      default:
        return cdk.RemovalPolicy.RETAIN;
    }
  }
}
