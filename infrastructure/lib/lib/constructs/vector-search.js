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
exports.VectorSearch = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const opensearch = __importStar(require("aws-cdk-lib/aws-opensearchservice"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const constructs_1 = require("constructs");
/**
 * VectorSearch construct creates an OpenSearch domain configured for vector search:
 * - Engine version supporting k-NN (OpenSearch 2.x)
 * - Encryption at rest with KMS
 * - Fine-grained access control enabled
 * - Appropriate instance types and shard configuration
 *
 * Requirements: 2.3, 3.4 - Query OpenSearch with vector search capabilities
 */
class VectorSearch extends constructs_1.Construct {
    /** The OpenSearch domain */
    domain;
    /** The domain ARN */
    domainArn;
    /** The domain endpoint */
    domainEndpoint;
    /** The domain name */
    domainName;
    constructor(scope, id, props) {
        super(scope, id);
        const instanceType = props.instanceType ?? 't3.small.search';
        const instanceCount = props.instanceCount ?? 1;
        const volumeSize = props.volumeSize ?? 10;
        const dedicatedMasterEnabled = props.dedicatedMasterEnabled ?? false;
        const zoneAwarenessEnabled = props.zoneAwarenessEnabled ?? false;
        const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
        // Create the OpenSearch domain with k-NN support
        this.domain = new opensearch.Domain(this, 'Domain', {
            domainName: props.domainName,
            // OpenSearch 2.11 supports k-NN for vector search
            version: opensearch.EngineVersion.OPENSEARCH_2_11,
            // Capacity configuration
            capacity: {
                dataNodeInstanceType: instanceType,
                dataNodes: instanceCount,
                masterNodeInstanceType: dedicatedMasterEnabled
                    ? (props.dedicatedMasterType ?? 't3.small.search')
                    : undefined,
                masterNodes: dedicatedMasterEnabled
                    ? (props.dedicatedMasterCount ?? 3)
                    : undefined,
            },
            // EBS storage configuration
            ebs: {
                volumeSize,
                volumeType: ec2.EbsDeviceVolumeType.GP3,
            },
            // Zone awareness for high availability
            zoneAwareness: zoneAwarenessEnabled
                ? {
                    enabled: true,
                    availabilityZoneCount: props.availabilityZoneCount ?? 2,
                }
                : { enabled: false },
            // Encryption at rest with KMS
            encryptionAtRest: {
                enabled: true,
                kmsKey: props.encryptionKey,
            },
            // Node-to-node encryption
            nodeToNodeEncryption: true,
            // Enforce HTTPS
            enforceHttps: true,
            tlsSecurityPolicy: opensearch.TLSSecurityPolicy.TLS_1_2,
            // Fine-grained access control
            fineGrainedAccessControl: {
                masterUserArn: this.createMasterUserRole().roleArn,
            },
            // Logging
            logging: {
                slowSearchLogEnabled: true,
                appLogEnabled: true,
                slowIndexLogEnabled: true,
            },
            // VPC configuration (if provided)
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets ? [props.vpcSubnets] : undefined,
            removalPolicy,
            // Enable UltraWarm for cost optimization (only for larger deployments)
            // ultrawarmEnabled: false,
        });
        this.domainArn = this.domain.domainArn;
        this.domainEndpoint = this.domain.domainEndpoint;
        this.domainName = this.domain.domainName;
    }
    /**
     * Creates a master user IAM role for fine-grained access control
     */
    createMasterUserRole() {
        return new iam.Role(this, 'MasterUserRole', {
            assumedBy: new iam.AccountRootPrincipal(),
            description: 'Master user role for OpenSearch fine-grained access control',
        });
    }
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee) {
        return this.domain.grantRead(grantee);
    }
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee) {
        return this.domain.grantReadWrite(grantee);
    }
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee) {
        return this.domain.grantWrite(grantee);
    }
    /**
     * Grant index read permissions to a principal for a specific index pattern
     */
    grantIndexRead(grantee, indexPattern) {
        return this.domain.grantIndexRead(indexPattern, grantee);
    }
    /**
     * Grant index read/write permissions to a principal for a specific index pattern
     */
    grantIndexReadWrite(grantee, indexPattern) {
        return this.domain.grantIndexReadWrite(indexPattern, grantee);
    }
}
exports.VectorSearch = VectorSearch;
//# sourceMappingURL=vector-search.js.map