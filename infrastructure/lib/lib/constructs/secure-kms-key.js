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
exports.SecureKmsKey = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
/**
 * SecureKmsKey construct creates a customer-managed KMS key with:
 * - Automatic key rotation enabled
 * - Key policy configured for cross-stack access
 * - Alias for easy reference
 *
 * Requirements: 5.2 - Encrypt all data at rest using AWS KMS customer managed keys
 */
class SecureKmsKey extends constructs_1.Construct {
    /** The KMS key */
    key;
    /** The key alias */
    alias;
    /** The key ARN */
    keyArn;
    /** The key ID */
    keyId;
    constructor(scope, id, props) {
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
    createKeyPolicy(additionalPrincipals) {
        const statements = [
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
            statements.push(new iam.PolicyStatement({
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
            }));
        }
        return new iam.PolicyDocument({ statements });
    }
    /**
     * Grant encrypt/decrypt permissions to a principal
     */
    grantEncryptDecrypt(grantee) {
        return this.key.grantEncryptDecrypt(grantee);
    }
    /**
     * Grant read (decrypt) permissions to a principal
     */
    grantDecrypt(grantee) {
        return this.key.grantDecrypt(grantee);
    }
}
exports.SecureKmsKey = SecureKmsKey;
//# sourceMappingURL=secure-kms-key.js.map