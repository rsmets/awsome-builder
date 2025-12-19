import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Properties for CognitoAuth construct
 */
export interface CognitoAuthProps {
    /** Name prefix for Cognito resources */
    readonly namePrefix: string;
    /** Password policy configuration */
    readonly passwordPolicy?: {
        minLength?: number;
        requireLowercase?: boolean;
        requireUppercase?: boolean;
        requireDigits?: boolean;
        requireSymbols?: boolean;
    };
    /** Enable MFA (default: false for dev, true for prod) */
    readonly mfaEnabled?: boolean;
    /** Removal policy for resources */
    readonly removalPolicy?: cdk.RemovalPolicy;
    /** Allowed callback URLs for the web client */
    readonly callbackUrls?: string[];
    /** Allowed logout URLs for the web client */
    readonly logoutUrls?: string[];
}
/**
 * CognitoAuth construct creates:
 * - User Pool with password policies and MFA
 * - User Pool Client for web application
 * - Identity Pool for authenticated AWS access
 * - User groups for role-based access (admin, agent)
 *
 * Requirements: 5.1 - Validate credentials via Amazon Cognito with role-based access control
 */
export declare class CognitoAuth extends Construct {
    /** The Cognito User Pool */
    readonly userPool: cognito.UserPool;
    /** The User Pool Client for web application */
    readonly userPoolClient: cognito.UserPoolClient;
    /** The Identity Pool for AWS credentials */
    readonly identityPool: cognito.CfnIdentityPool;
    /** IAM role for authenticated users */
    readonly authenticatedRole: iam.Role;
    /** IAM role for admin users */
    readonly adminRole: iam.Role;
    /** IAM role for agent users */
    readonly agentRole: iam.Role;
    /** Admin user group */
    readonly adminGroup: cognito.CfnUserPoolGroup;
    /** Agent user group */
    readonly agentGroup: cognito.CfnUserPoolGroup;
    constructor(scope: Construct, id: string, props: CognitoAuthProps);
    /**
     * Creates the base authenticated role for Identity Pool
     */
    private createAuthenticatedRole;
    /**
     * Creates the admin role with elevated permissions
     */
    private createAdminRole;
    /**
     * Creates the agent role with standard permissions
     */
    private createAgentRole;
    /** User Pool ID */
    get userPoolId(): string;
    /** User Pool ARN */
    get userPoolArn(): string;
    /** User Pool Client ID */
    get userPoolClientId(): string;
    /** Identity Pool ID */
    get identityPoolId(): string;
}
//# sourceMappingURL=cognito-auth.d.ts.map