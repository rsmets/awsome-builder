import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { SecureBucket } from '../constructs/secure-bucket';
import { FlowOpsTables } from '../constructs/flowops-tables';
import { VectorSearch } from '../constructs/vector-search';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for DataStack
 */
export interface DataStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
  /** KMS key from Foundation Stack */
  readonly kmsKey: kms.IKey;
}

/**
 * DataStack provides all persistent data storage infrastructure:
 * - S3 bucket for document storage with versioning
 * - DynamoDB tables for tickets, conversations, and metadata
 * - OpenSearch domain for vector search
 * 
 * Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class DataStack extends cdk.Stack {
  /** Documents S3 bucket */
  public readonly documentsBucket: SecureBucket;
  /** FlowOps DynamoDB tables */
  public readonly tables: FlowOpsTables;
  /** OpenSearch vector search domain */
  public readonly vectorSearch: VectorSearch;

  // Individual table references
  /** Tickets table */
  public readonly ticketsTable: any;
  /** Conversations table */
  public readonly conversationsTable: any;
  /** Metadata table */
  public readonly metadataTable: any;
  /** OpenSearch domain */
  public readonly openSearchDomain: any;

  // Exported values for cross-stack references
  /** Documents bucket ARN */
  public readonly documentsBucketArn: string;
  /** Documents bucket name */
  public readonly documentsBucketName: string;
  /** Tickets table ARN */
  public readonly ticketsTableArn: string;
  /** Tickets table name */
  public readonly ticketsTableName: string;
  /** Conversations table ARN */
  public readonly conversationsTableArn: string;
  /** Conversations table name */
  public readonly conversationsTableName: string;
  /** Metadata table ARN */
  public readonly metadataTableArn: string;
  /** Metadata table name */
  public readonly metadataTableName: string;
  /** OpenSearch domain ARN */
  public readonly openSearchDomainArn: string;
  /** OpenSearch domain endpoint */
  public readonly openSearchEndpoint: string;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;
    const removalPolicy = this.getRemovalPolicy(config.removalPolicy);

    // Use KMS key from Foundation Stack
    const encryptionKey = props.kmsKey;

    // Create Documents S3 Bucket
    this.documentsBucket = new SecureBucket(this, 'DocumentsBucket', {
      encryptionKey,
      versioned: true,
      eventBridgeEnabled: true, // For triggering ingestion workflows
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
    });

    // Create DynamoDB Tables
    this.tables = new FlowOpsTables(this, 'Tables', {
      namePrefix,
      encryptionKey,
      pointInTimeRecovery: config.dynamodb.pointInTimeRecovery,
      removalPolicy,
    });

    // Create OpenSearch Domain for Vector Search
    this.vectorSearch = new VectorSearch(this, 'VectorSearch', {
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
    
    // Store table references
    this.ticketsTable = this.tables.ticketsTable;
    this.conversationsTable = this.tables.conversationsTable;
    this.metadataTable = this.tables.metadataTable;
    this.openSearchDomain = this.vectorSearch.domain;
    
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
  private createOutputs(namePrefix: string): void {
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
  private getRemovalPolicy(policy: string): cdk.RemovalPolicy {
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
