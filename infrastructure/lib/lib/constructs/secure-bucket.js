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
exports.SecureBucket = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
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
class SecureBucket extends constructs_1.Construct {
    /** The S3 bucket */
    bucket;
    /** The bucket ARN */
    bucketArn;
    /** The bucket name */
    bucketName;
    constructor(scope, id, props) {
        super(scope, id);
        const versioned = props.versioned ?? true;
        const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
        const autoDeleteObjects = props.autoDeleteObjects ?? (removalPolicy === cdk.RemovalPolicy.DESTROY);
        const eventBridgeEnabled = props.eventBridgeEnabled ?? false;
        // Default lifecycle rules for cost optimization
        const defaultLifecycleRules = [
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
        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
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
        }));
        this.bucketArn = this.bucket.bucketArn;
        this.bucketName = this.bucket.bucketName;
    }
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee) {
        return this.bucket.grantRead(grantee);
    }
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee) {
        return this.bucket.grantReadWrite(grantee);
    }
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee) {
        return this.bucket.grantWrite(grantee);
    }
    /**
     * Grant delete permissions to a principal
     */
    grantDelete(grantee) {
        return this.bucket.grantDelete(grantee);
    }
}
exports.SecureBucket = SecureBucket;
//# sourceMappingURL=secure-bucket.js.map