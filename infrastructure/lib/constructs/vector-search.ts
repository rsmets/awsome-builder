import * as cdk from 'aws-cdk-lib';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Properties for VectorSearch construct
 */
export interface VectorSearchProps {
  /** Domain name for OpenSearch */
  readonly domainName: string;
  /** KMS key for encryption at rest */
  readonly encryptionKey: kms.IKey;
  /** Instance type for OpenSearch nodes */
  readonly instanceType?: string;
  /** Number of data nodes */
  readonly instanceCount?: number;
  /** EBS volume size in GB */
  readonly volumeSize?: number;
  /** Enable dedicated master nodes */
  readonly dedicatedMasterEnabled?: boolean;
  /** Dedicated master instance type */
  readonly dedicatedMasterType?: string;
  /** Number of dedicated master nodes */
  readonly dedicatedMasterCount?: number;
  /** Enable multi-AZ deployment */
  readonly zoneAwarenessEnabled?: boolean;
  /** Number of availability zones (2 or 3) */
  readonly availabilityZoneCount?: number;
  /** VPC for deployment (optional - if not provided, uses public access) */
  readonly vpc?: ec2.IVpc;
  /** VPC subnets for deployment */
  readonly vpcSubnets?: ec2.SubnetSelection;
  /** Removal policy for the domain */
  readonly removalPolicy?: cdk.RemovalPolicy;
}

/**
 * VectorSearch construct creates an OpenSearch domain configured for vector search:
 * - Engine version supporting k-NN (OpenSearch 2.x)
 * - Encryption at rest with KMS
 * - Fine-grained access control enabled
 * - Appropriate instance types and shard configuration
 * 
 * Requirements: 2.3, 3.4 - Query OpenSearch with vector search capabilities
 */
export class VectorSearch extends Construct {
  /** The OpenSearch domain */
  public readonly domain: opensearch.Domain;
  /** The domain ARN */
  public readonly domainArn: string;
  /** The domain endpoint */
  public readonly domainEndpoint: string;
  /** The domain name */
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: VectorSearchProps) {
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
  private createMasterUserRole(): iam.Role {
    return new iam.Role(this, 'MasterUserRole', {
      assumedBy: new iam.AccountRootPrincipal(),
      description: 'Master user role for OpenSearch fine-grained access control',
    });
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantRead(grantee);
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantReadWrite(grantee);
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: iam.IGrantable): iam.Grant {
    return this.domain.grantWrite(grantee);
  }

  /**
   * Grant index read permissions to a principal for a specific index pattern
   */
  public grantIndexRead(grantee: iam.IGrantable, indexPattern: string): iam.Grant {
    return this.domain.grantIndexRead(indexPattern, grantee);
  }

  /**
   * Grant index read/write permissions to a principal for a specific index pattern
   */
  public grantIndexReadWrite(grantee: iam.IGrantable, indexPattern: string): iam.Grant {
    return this.domain.grantIndexReadWrite(indexPattern, grantee);
  }
}
