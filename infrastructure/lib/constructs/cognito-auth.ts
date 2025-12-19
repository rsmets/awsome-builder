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
export class CognitoAuth extends Construct {
  /** The Cognito User Pool */
  public readonly userPool: cognito.UserPool;
  /** The User Pool Client for web application */
  public readonly userPoolClient: cognito.UserPoolClient;
  /** The Identity Pool for AWS credentials */
  public readonly identityPool: cognito.CfnIdentityPool;
  /** IAM role for authenticated users */
  public readonly authenticatedRole: iam.Role;
  /** IAM role for admin users */
  public readonly adminRole: iam.Role;
  /** IAM role for agent users */
  public readonly agentRole: iam.Role;
  /** Admin user group */
  public readonly adminGroup: cognito.CfnUserPoolGroup;
  /** Agent user group */
  public readonly agentGroup: cognito.CfnUserPoolGroup;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
    const mfaEnabled = props.mfaEnabled ?? false;

    // Create User Pool with password policies
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.namePrefix}-user-pool`,
      selfSignUpEnabled: false, // Admin creates users
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        tenantId: new cognito.StringAttribute({
          mutable: false,
        }),
      },
      passwordPolicy: {
        minLength: props.passwordPolicy?.minLength ?? 8,
        requireLowercase: props.passwordPolicy?.requireLowercase ?? true,
        requireUppercase: props.passwordPolicy?.requireUppercase ?? true,
        requireDigits: props.passwordPolicy?.requireDigits ?? true,
        requireSymbols: props.passwordPolicy?.requireSymbols ?? false,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      mfa: mfaEnabled ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy,
    });

    // Create User Pool Client for web application
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${props.namePrefix}-web-client`,
      generateSecret: false, // Public client for SPA
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: props.callbackUrls ?? ['http://localhost:3000/callback'],
        logoutUrls: props.logoutUrls ?? ['http://localhost:3000/logout'],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // Create Identity Pool for authenticated AWS access
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `${props.namePrefix}_identity_pool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Create IAM roles for authenticated users
    this.authenticatedRole = this.createAuthenticatedRole(props.namePrefix);
    this.adminRole = this.createAdminRole(props.namePrefix);
    this.agentRole = this.createAgentRole(props.namePrefix);

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
      },
      roleMappings: {
        cognitoProvider: {
          identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`,
          type: 'Token',
          ambiguousRoleResolution: 'AuthenticatedRole',
        },
      },
    });

    // Create user groups for role-based access
    this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admin',
      description: 'Administrators with full access',
      roleArn: this.adminRole.roleArn,
      precedence: 1,
    });

    this.agentGroup = new cognito.CfnUserPoolGroup(this, 'AgentGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'agent',
      description: 'Support agents with standard access',
      roleArn: this.agentRole.roleArn,
      precedence: 2,
    });
  }

  /**
   * Creates the base authenticated role for Identity Pool
   */
  private createAuthenticatedRole(namePrefix: string): iam.Role {
    const role = new iam.Role(this, 'AuthenticatedRole', {
      roleName: `${namePrefix}-cognito-authenticated`,
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    return role;
  }

  /**
   * Creates the admin role with elevated permissions
   */
  private createAdminRole(namePrefix: string): iam.Role {
    const role = new iam.Role(this, 'AdminRole', {
      roleName: `${namePrefix}-cognito-admin`,
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    return role;
  }

  /**
   * Creates the agent role with standard permissions
   */
  private createAgentRole(namePrefix: string): iam.Role {
    const role = new iam.Role(this, 'AgentRole', {
      roleName: `${namePrefix}-cognito-agent`,
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    return role;
  }

  /** User Pool ID */
  get userPoolId(): string {
    return this.userPool.userPoolId;
  }

  /** User Pool ARN */
  get userPoolArn(): string {
    return this.userPool.userPoolArn;
  }

  /** User Pool Client ID */
  get userPoolClientId(): string {
    return this.userPoolClient.userPoolClientId;
  }

  /** Identity Pool ID */
  get identityPoolId(): string {
    return this.identityPool.ref;
  }
}
