"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoAuth = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
/**
 * CognitoAuth construct creates:
 * - User Pool with password policies and MFA
 * - User Pool Client for web application
 * - Identity Pool for authenticated AWS access
 * - User groups for role-based access (admin, agent)
 *
 * Requirements: 5.1 - Validate credentials via Amazon Cognito with role-based access control
 */
class CognitoAuth extends constructs_1.Construct {
    /** The Cognito User Pool */
    userPool;
    /** The User Pool Client for web application */
    userPoolClient;
    /** The Identity Pool for AWS credentials */
    identityPool;
    /** IAM role for authenticated users */
    authenticatedRole;
    /** IAM role for admin users */
    adminRole;
    /** IAM role for agent users */
    agentRole;
    /** Admin user group */
    adminGroup;
    /** Agent user group */
    agentGroup;
    constructor(scope, id, props) {
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
    createAuthenticatedRole(namePrefix) {
        const role = new iam.Role(this, 'AuthenticatedRole', {
            roleName: `${namePrefix}-cognito-authenticated`,
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
        });
        return role;
    }
    /**
     * Creates the admin role with elevated permissions
     */
    createAdminRole(namePrefix) {
        const role = new iam.Role(this, 'AdminRole', {
            roleName: `${namePrefix}-cognito-admin`,
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
        });
        return role;
    }
    /**
     * Creates the agent role with standard permissions
     */
    createAgentRole(namePrefix) {
        const role = new iam.Role(this, 'AgentRole', {
            roleName: `${namePrefix}-cognito-agent`,
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
        });
        return role;
    }
    /** User Pool ID */
    get userPoolId() {
        return this.userPool.userPoolId;
    }
    /** User Pool ARN */
    get userPoolArn() {
        return this.userPool.userPoolArn;
    }
    /** User Pool Client ID */
    get userPoolClientId() {
        return this.userPoolClient.userPoolClientId;
    }
    /** Identity Pool ID */
    get identityPoolId() {
        return this.identityPool.ref;
    }
}
exports.CognitoAuth = CognitoAuth;
//# sourceMappingURL=cognito-auth.js.map