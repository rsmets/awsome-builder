import * as cdk from 'aws-cdk-lib';
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
export declare class FlowOpsTables extends Construct {
    /** Tickets table */
    readonly ticketsTable: TenantIsolatedTable;
    /** Conversations table */
    readonly conversationsTable: TenantIsolatedTable;
    /** Metadata table for documents */
    readonly metadataTable: TenantIsolatedTable;
    constructor(scope: Construct, id: string, props: FlowOpsTablesProps);
    /** Get all table ARNs */
    get tableArns(): string[];
    /** Get all table names */
    get tableNames(): string[];
}
//# sourceMappingURL=flowops-tables.d.ts.map