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
exports.FlowOpsTables = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
const tenant_isolated_table_1 = require("./tenant-isolated-table");
/**
 * FlowOpsTables construct creates all DynamoDB tables for FlowOps:
 * - TicketsTable: Ticket records with GSIs for status and timestamp queries
 * - ConversationsTable: Chat conversation history with GSI for ticket lookup
 * - MetadataTable: Document metadata and approval workflow state
 *
 * Table Design (from design.md):
 *
 * TicketsTable:
 * - PK: TENANT#<tenant_id>
 * - SK: TICKET#<ticket_id>
 * - GSI1: STATUS#<status> / CREATED#<timestamp> (query by status)
 * - GSI2: TENANT#<tenant_id> / UPDATED#<timestamp> (recent tickets)
 *
 * ConversationsTable:
 * - PK: TENANT#<tenant_id>
 * - SK: CONV#<conversation_id>#MSG#<message_id>
 * - GSI1: TICKET#<ticket_id> / CREATED#<timestamp> (conversations by ticket)
 *
 * Requirements: 3.1, 3.2, 3.5
 */
class FlowOpsTables extends constructs_1.Construct {
    /** Tickets table */
    ticketsTable;
    /** Conversations table */
    conversationsTable;
    /** Metadata table for documents */
    metadataTable;
    constructor(scope, id, props) {
        super(scope, id);
        const pointInTimeRecovery = props.pointInTimeRecovery ?? true;
        const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
        // Create Tickets Table
        this.ticketsTable = new tenant_isolated_table_1.TenantIsolatedTable(this, 'TicketsTable', {
            tableName: `${props.namePrefix}-tickets`,
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            encryptionKey: props.encryptionKey,
            pointInTimeRecovery,
            removalPolicy,
            globalSecondaryIndexes: [
                {
                    // GSI1: Query tickets by status across tenants (for admin dashboards)
                    indexName: 'GSI1',
                    partitionKey: {
                        name: 'GSI1PK',
                        type: dynamodb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'GSI1SK',
                        type: dynamodb.AttributeType.STRING,
                    },
                },
                {
                    // GSI2: Query recent tickets by tenant
                    indexName: 'GSI2',
                    partitionKey: {
                        name: 'GSI2PK',
                        type: dynamodb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'GSI2SK',
                        type: dynamodb.AttributeType.STRING,
                    },
                },
            ],
        });
        // Create Conversations Table
        this.conversationsTable = new tenant_isolated_table_1.TenantIsolatedTable(this, 'ConversationsTable', {
            tableName: `${props.namePrefix}-conversations`,
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            encryptionKey: props.encryptionKey,
            pointInTimeRecovery,
            removalPolicy,
            globalSecondaryIndexes: [
                {
                    // GSI1: Query conversations by ticket
                    indexName: 'GSI1',
                    partitionKey: {
                        name: 'GSI1PK',
                        type: dynamodb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'GSI1SK',
                        type: dynamodb.AttributeType.STRING,
                    },
                },
            ],
        });
        // Create Metadata Table for document approval workflow
        this.metadataTable = new tenant_isolated_table_1.TenantIsolatedTable(this, 'MetadataTable', {
            tableName: `${props.namePrefix}-metadata`,
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING,
            },
            encryptionKey: props.encryptionKey,
            pointInTimeRecovery,
            removalPolicy,
            globalSecondaryIndexes: [
                {
                    // GSI1: Query documents by status (pending approval, approved, etc.)
                    indexName: 'GSI1',
                    partitionKey: {
                        name: 'GSI1PK',
                        type: dynamodb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'GSI1SK',
                        type: dynamodb.AttributeType.STRING,
                    },
                },
                {
                    // GSI2: Query documents by type/category
                    indexName: 'GSI2',
                    partitionKey: {
                        name: 'GSI2PK',
                        type: dynamodb.AttributeType.STRING,
                    },
                    sortKey: {
                        name: 'GSI2SK',
                        type: dynamodb.AttributeType.STRING,
                    },
                },
            ],
        });
    }
    /** Get all table ARNs */
    get tableArns() {
        return [
            this.ticketsTable.tableArn,
            this.conversationsTable.tableArn,
            this.metadataTable.tableArn,
        ];
    }
    /** Get all table names */
    get tableNames() {
        return [
            this.ticketsTable.tableName,
            this.conversationsTable.tableName,
            this.metadataTable.tableName,
        ];
    }
}
exports.FlowOpsTables = FlowOpsTables;
//# sourceMappingURL=flowops-tables.js.map