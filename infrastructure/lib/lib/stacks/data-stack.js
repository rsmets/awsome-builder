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
exports.DataStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const secure_bucket_1 = require("../constructs/secure-bucket");
const flowops_tables_1 = require("../constructs/flowops-tables");
const vector_search_1 = require("../constructs/vector-search");
/**
 * DataStack provides all persistent data storage infrastructure:
 * - S3 bucket for document storage with versioning
 * - DynamoDB tables for tickets, conversations, and metadata
 * - OpenSearch domain for vector search
 *
 * Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5
 */
class DataStack extends cdk.Stack {
    /** Documents S3 bucket */
    documentsBucket;
    /** FlowOps DynamoDB tables */
    tables;
    /** OpenSearch vector search domain */
    vectorSearch;
    // Exported values for cross-stack references
    /** Documents bucket ARN */
    documentsBucketArn;
    /** Documents bucket name */
    documentsBucketName;
    /** Tickets table ARN */
    ticketsTableArn;
    /** Tickets table name */
    ticketsTableName;
    /** Conversations table ARN */
    conversationsTableArn;
    /** Conversations table name */
    conversationsTableName;
    /** Metadata table ARN */
    metadataTableArn;
    /** Metadata table name */
    metadataTableName;
    /** OpenSearch domain ARN */
    openSearchDomainArn;
    /** OpenSearch domain endpoint */
    openSearchEndpoint;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { config } = props;
        const namePrefix = `flowops-${config.environment}`;
        const removalPolicy = this.getRemovalPolicy(config.removalPolicy);
        // Import KMS key from Foundation Stack
        const encryptionKey = kms.Key.fromKeyArn(this, 'EncryptionKey', props.kmsKeyArn);
        // Create Documents S3 Bucket
        this.documentsBucket = new secure_bucket_1.SecureBucket(this, 'DocumentsBucket', {
            encryptionKey,
            versioned: true,
            eventBridgeEnabled: true, // For triggering ingestion workflows
            removalPolicy,
            autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
        });
        // Create DynamoDB Tables
        this.tables = new flowops_tables_1.FlowOpsTables(this, 'Tables', {
            namePrefix,
            encryptionKey,
            pointInTimeRecovery: config.dynamodb.pointInTimeRecovery,
            removalPolicy,
        });
        // Create OpenSearch Domain for Vector Search
        this.vectorSearch = new vector_search_1.VectorSearch(this, 'VectorSearch', {
            domainName: `${namePrefix}-vectors`,
            encryptionKey,
            instanceType: config.opensearch.instanceType,
            instanceCount: config.opensearch.instanceCount,
            volumeSize: config.opensearch.volumeSize,
            dedicatedMasterEnabled: config.opensearch.dedicatedMasterEnabled,
            zoneAwarenessEnabled: config.opensearch.zoneAwarenessEnabled,
            removalPolicy,
        });
        // Store exported values
        this.documentsBucketArn = this.documentsBucket.bucketArn;
        this.documentsBucketName = this.documentsBucket.bucketName;
        this.ticketsTableArn = this.tables.ticketsTable.tableArn;
        this.ticketsTableName = this.tables.ticketsTable.tableName;
        this.conversationsTableArn = this.tables.conversationsTable.tableArn;
        this.conversationsTableName = this.tables.conversationsTable.tableName;
        this.metadataTableArn = this.tables.metadataTable.tableArn;
        this.metadataTableName = this.tables.metadataTable.tableName;
        this.openSearchDomainArn = this.vectorSearch.domainArn;
        this.openSearchEndpoint = this.vectorSearch.domainEndpoint;
        // Create CloudFormation outputs for cross-stack references
        this.createOutputs(namePrefix);
        // Add tags
        cdk.Tags.of(this).add('Project', 'FlowOps');
        cdk.Tags.of(this).add('Environment', config.environment);
        cdk.Tags.of(this).add('Stack', 'Data');
    }
    /**
     * Create CloudFormation outputs for cross-stack references
     */
    createOutputs(namePrefix) {
        // S3 Bucket outputs
        new cdk.CfnOutput(this, 'DocumentsBucketArn', {
            value: this.documentsBucketArn,
            description: 'Documents S3 Bucket ARN',
            exportName: `${namePrefix}-documents-bucket-arn`,
        });
        new cdk.CfnOutput(this, 'DocumentsBucketName', {
            value: this.documentsBucketName,
            description: 'Documents S3 Bucket Name',
            exportName: `${namePrefix}-documents-bucket-name`,
        });
        // DynamoDB Table outputs
        new cdk.CfnOutput(this, 'TicketsTableArn', {
            value: this.ticketsTableArn,
            description: 'Tickets DynamoDB Table ARN',
            exportName: `${namePrefix}-tickets-table-arn`,
        });
        new cdk.CfnOutput(this, 'TicketsTableName', {
            value: this.ticketsTableName,
            description: 'Tickets DynamoDB Table Name',
            exportName: `${namePrefix}-tickets-table-name`,
        });
        new cdk.CfnOutput(this, 'ConversationsTableArn', {
            value: this.conversationsTableArn,
            description: 'Conversations DynamoDB Table ARN',
            exportName: `${namePrefix}-conversations-table-arn`,
        });
        new cdk.CfnOutput(this, 'ConversationsTableName', {
            value: this.conversationsTableName,
            description: 'Conversations DynamoDB Table Name',
            exportName: `${namePrefix}-conversations-table-name`,
        });
        new cdk.CfnOutput(this, 'MetadataTableArn', {
            value: this.metadataTableArn,
            description: 'Metadata DynamoDB Table ARN',
            exportName: `${namePrefix}-metadata-table-arn`,
        });
        new cdk.CfnOutput(this, 'MetadataTableName', {
            value: this.metadataTableName,
            description: 'Metadata DynamoDB Table Name',
            exportName: `${namePrefix}-metadata-table-name`,
        });
        // OpenSearch outputs
        new cdk.CfnOutput(this, 'OpenSearchDomainArn', {
            value: this.openSearchDomainArn,
            description: 'OpenSearch Domain ARN',
            exportName: `${namePrefix}-opensearch-domain-arn`,
        });
        new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
            value: this.openSearchEndpoint,
            description: 'OpenSearch Domain Endpoint',
            exportName: `${namePrefix}-opensearch-endpoint`,
        });
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
exports.DataStack = DataStack;
//# sourceMappingURL=data-stack.js.map