import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Global Secondary Index configuration
 */
export interface GSIConfig {
  /** Index name */
  readonly indexName: string;
  /** Partition key for the GSI */
  readonly partitionKey: dynamodb.Attribute;
  /** Sort key for the GSI (optional) */
  readonly sortKey?: dynamodb.Attribute;
  /** Projection type (default: ALL) */
  readonly projectionType?: dynamodb.ProjectionType;
  /** Non-key attributes to project (for INCLUDE projection) */
  readonly nonKeyAttributes?: string[];
}

/**
 * Properties for TenantIsolatedTable construct
 */
export interface TenantIsolatedTableProps {
  /** Table name */
  readonly tableName: string;
  /** Partition key for the table */
  readonly partitionKey: dynamodb.Attribute;
  /** Sort key for the table (optional) */
  readonly sortKey?: dynamodb.Attribute;
  /** KMS key for encryption at rest */
  readonly encryptionKey: kms.IKey;
  /** Enable point-in-time recovery (default: true) */
  readonly pointInTimeRecovery?: boolean;
  /** Billing mode (default: PAY_PER_REQUEST) */
  readonly billingMode?: dynamodb.BillingMode;
  /** Global Secondary Indexes */
  readonly globalSecondaryIndexes?: GSIConfig[];
  /** Removal policy for the table */
  readonly removalPolicy?: cdk.RemovalPolicy;
  /** Enable DynamoDB Streams */
  readonly stream?: dynamodb.StreamViewType;
  /** Time to live attribute name */
  readonly timeToLiveAttribute?: string;
}

/**
 * TenantIsolatedTable construct creates a DynamoDB table with:
 * - On-demand capacity mode for cost optimization
 * - Point-in-time recovery for data protection
 * - Encryption at rest with KMS customer managed key
 * - Tenant isolation via partition key design
 * 
 * Requirements: 3.1, 3.2, 5.2 - Store data in DynamoDB with tenant isolation and encryption
 */
export class TenantIsolatedTable extends Construct {
  /** The DynamoDB table */
  public readonly table: dynamodb.Table;
  /** The table ARN */
  public readonly tableArn: string;
  /** The table name */
  public readonly tableName: string;
  /** The table stream ARN (if streams enabled) */
  public readonly tableStreamArn?: string;

  constructor(scope: Construct, id: string, props: TenantIsolatedTableProps) {
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
  public grantRead(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantReadData(grantee);
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantReadWriteData(grantee);
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantWriteData(grantee);
  }

  /**
   * Grant stream read permissions to a principal
   */
  public grantStreamRead(grantee: iam.IGrantable): iam.Grant {
    return this.table.grantStreamRead(grantee);
  }

  /**
   * Create a tenant-scoped IAM policy statement for read access
   * This enforces tenant isolation at the IAM level
   */
  public createTenantScopedReadPolicy(tenantIdPlaceholder: string = '${aws:PrincipalTag/tenantId}'): iam.PolicyStatement {
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
  public createTenantScopedWritePolicy(tenantIdPlaceholder: string = '${aws:PrincipalTag/tenantId}'): iam.PolicyStatement {
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
