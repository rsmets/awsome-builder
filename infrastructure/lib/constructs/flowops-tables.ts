import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { TenantIsolatedTable } from './tenant-isolated-table';

/**
 * Properties for FlowOpsTables construct
 */
export interface FlowOpsTablesProps {
  /** Name prefix for tables */
  readonly namePrefix: string;
  /** KMS key for encryption at rest */
  readonly encryptionKey: kms.IKey;
  /** Enable point-in-time recovery */
  readonly pointInTimeRecovery?: boolean;
  /** Removal policy for tables */
  readonly removalPolicy?: cdk.RemovalPolicy;
}

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
export class FlowOpsTables extends Construct {
  /** Tickets table */
  public readonly ticketsTable: TenantIsolatedTable;
  /** Conversations table */
  public readonly conversationsTable: TenantIsolatedTable;
  /** Metadata table for documents */
  public readonly metadataTable: TenantIsolatedTable;

  constructor(scope: Construct, id: string, props: FlowOpsTablesProps) {
    super(scope, id);

    const pointInTimeRecovery = props.pointInTimeRecovery ?? true;
    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;

    // Create Tickets Table
    this.ticketsTable = new TenantIsolatedTable(this, 'TicketsTable', {
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
    this.conversationsTable = new TenantIsolatedTable(this, 'ConversationsTable', {
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
    this.metadataTable = new TenantIsolatedTable(this, 'MetadataTable', {
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
  get tableArns(): string[] {
    return [
      this.ticketsTable.tableArn,
      this.conversationsTable.tableArn,
      this.metadataTable.tableArn,
    ];
  }

  /** Get all table names */
  get tableNames(): string[] {
    return [
      this.ticketsTable.tableName,
      this.conversationsTable.tableName,
      this.metadataTable.tableName,
    ];
  }
}
