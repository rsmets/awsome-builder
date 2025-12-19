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
export declare class SecureKmsKey extends Construct {
    /** The KMS key */
    readonly key: kms.Key;
    /** The key alias */
    readonly alias: kms.Alias;
    /** The key ARN */
    readonly keyArn: string;
    /** The key ID */
    readonly keyId: string;
    constructor(scope: Construct, id: string, props: SecureKmsKeyProps);
    /**
     * Creates the key policy for cross-stack access
     */
    private createKeyPolicy;
    /**
     * Grant encrypt/decrypt permissions to a principal
     */
    grantEncryptDecrypt(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant read (decrypt) permissions to a principal
     */
    grantDecrypt(grantee: iam.IGrantable): iam.Grant;
}
//# sourceMappingURL=secure-kms-key.d.ts.map