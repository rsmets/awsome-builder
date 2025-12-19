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
export declare class FoundationStack extends cdk.Stack {
    /** The KMS key construct */
    readonly kmsKey: SecureKmsKey;
    /** The Cognito auth construct */
    readonly cognitoAuth: CognitoAuth;
    /** KMS Key ARN */
    readonly kmsKeyArn: string;
    /** KMS Key ID */
    readonly kmsKeyId: string;
    /** Cognito User Pool ID */
    readonly userPoolId: string;
    /** Cognito User Pool ARN */
    readonly userPoolArn: string;
    /** Cognito User Pool Client ID */
    readonly userPoolClientId: string;
    /** Cognito Identity Pool ID */
    readonly identityPoolId: string;
    constructor(scope: Construct, id: string, props: FoundationStackProps);
    /**
     * Convert config removal policy string to CDK RemovalPolicy
     */
    private getRemovalPolicy;
}
//# sourceMappingURL=foundation-stack.d.ts.map