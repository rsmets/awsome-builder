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
exports.FoundationStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const secure_kms_key_1 = require("../constructs/secure-kms-key");
const cognito_auth_1 = require("../constructs/cognito-auth");
/**
 * FoundationStack provides core security and identity infrastructure:
 * - KMS customer managed key for all data encryption
 * - Cognito User Pool for authentication
 * - Cognito Identity Pool for AWS credentials
 * - User groups for role-based access control
 *
 * Requirements: 5.1, 5.2
 */
class FoundationStack extends cdk.Stack {
    /** The KMS key construct */
    kmsKey;
    /** The Cognito auth construct */
    cognitoAuth;
    // Exported values for cross-stack references
    /** KMS Key ARN */
    kmsKeyArn;
    /** KMS Key ID */
    kmsKeyId;
    /** Cognito User Pool ID */
    userPoolId;
    /** Cognito User Pool ARN */
    userPoolArn;
    /** Cognito User Pool Client ID */
    userPoolClientId;
    /** Cognito Identity Pool ID */
    identityPoolId;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { config } = props;
        const namePrefix = `flowops-${config.environment}`;
        const removalPolicy = this.getRemovalPolicy(config.removalPolicy);
        // Create KMS customer managed key
        this.kmsKey = new secure_kms_key_1.SecureKmsKey(this, 'EncryptionKey', {
            aliasName: `${namePrefix}-encryption-key`,
            description: `FlowOps ${config.environment} encryption key for all data at rest`,
            enableKeyRotation: true,
            removalPolicy,
        });
        // Create Cognito User Pool and Identity Pool
        this.cognitoAuth = new cognito_auth_1.CognitoAuth(this, 'Auth', {
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
    getRemovalPolicy(policy) {
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
exports.FoundationStack = FoundationStack;
//# sourceMappingURL=foundation-stack.js.map