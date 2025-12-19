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
exports.TenantIsolatedTable = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
/**
 * TenantIsolatedTable construct creates a DynamoDB table with:
 * - On-demand capacity mode for cost optimization
 * - Point-in-time recovery for data protection
 * - Encryption at rest with KMS customer managed key
 * - Tenant isolation via partition key design
 *
 * Requirements: 3.1, 3.2, 5.2 - Store data in DynamoDB with tenant isolation and encryption
 */
class TenantIsolatedTable extends constructs_1.Construct {
    /** The DynamoDB table */
    table;
    /** The table ARN */
    tableArn;
    /** The table name */
    tableName;
    /** The table stream ARN (if streams enabled) */
    tableStreamArn;
    constructor(scope, id, props) {
        super(scope, id);
        const pointInTimeRecovery = props.pointInTimeRecovery ?? true;
        const billingMode = props.billingMode ?? dynamodb.BillingMode.PAY_PER_REQUEST;
        const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
        // Create the DynamoDB table
        this.table = new dynamodb.Table(this, 'Table', {
            tableName: props.tableName,
            partitionKey: props.partitionKey,
            sortKey: props.sortKey,
            billingMode,
            pointInTimeRecovery,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: props.encryptionKey,
            removalPolicy,
            stream: props.stream,
            timeToLiveAttribute: props.timeToLiveAttribute,
            contributorInsightsEnabled: true,
        });
        // Add Global Secondary Indexes
        if (props.globalSecondaryIndexes) {
            for (const gsi of props.globalSecondaryIndexes) {
                this.table.addGlobalSecondaryIndex({
                    indexName: gsi.indexName,
                    partitionKey: gsi.partitionKey,
                    sortKey: gsi.sortKey,
                    projectionType: gsi.projectionType ?? dynamodb.ProjectionType.ALL,
                    nonKeyAttributes: gsi.nonKeyAttributes,
                });
            }
        }
        this.tableArn = this.table.tableArn;
        this.tableName = this.table.tableName;
        this.tableStreamArn = this.table.tableStreamArn;
    }
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee) {
        return this.table.grantReadData(grantee);
    }
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee) {
        return this.table.grantWriteData(grantee);
    }
    /**
     * Grant stream read permissions to a principal
     */
    grantStreamRead(grantee) {
        return this.table.grantStreamRead(grantee);
    }
    /**
     * Create a tenant-scoped IAM policy statement for read access
     * This enforces tenant isolation at the IAM level
     */
    createTenantScopedReadPolicy(tenantIdPlaceholder = '${aws:PrincipalTag/tenantId}') {
        return new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
            ],
            resources: [this.tableArn, `${this.tableArn}/index/*`],
            conditions: {
                'ForAllValues:StringLike': {
                    'dynamodb:LeadingKeys': [`TENANT#${tenantIdPlaceholder}*`],
                },
            },
        });
    }
    /**
     * Create a tenant-scoped IAM policy statement for write access
     * This enforces tenant isolation at the IAM level
     */
    createTenantScopedWritePolicy(tenantIdPlaceholder = '${aws:PrincipalTag/tenantId}') {
        return new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:BatchWriteItem',
            ],
            resources: [this.tableArn],
            conditions: {
                'ForAllValues:StringLike': {
                    'dynamodb:LeadingKeys': [`TENANT#${tenantIdPlaceholder}*`],
                },
            },
        });
    }
}
exports.TenantIsolatedTable = TenantIsolatedTable;
//# sourceMappingURL=tenant-isolated-table.js.map