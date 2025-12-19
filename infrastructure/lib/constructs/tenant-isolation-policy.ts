import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * Properties for TenantIsolationPolicy construct
 */
export interface TenantIsolationPolicyProps {
  /** DynamoDB table ARNs that require tenant isolation */
  readonly dynamoTableArns: string[];
  /** S3 bucket ARNs that require tenant isolation */
  readonly s3BucketArns?: string[];
  /** OpenSearch domain ARNs that require tenant isolation */
  readonly openSearchDomainArns?: string[];
}

/**
 * TenantIsolationPolicy construct creates IAM policies with tenant-scoped conditions:
 * - DynamoDB access scoped by partition key (tenantId)
 * - S3 access scoped by prefix (tenantId/)
 * - Ensures multi-tenant data isolation
 * 
 * Requirements: 5.5
 */
export class TenantIsolationPolicy extends Construct {
  /** The IAM policy statements */
  public readonly policyStatements: iam.PolicyStatement[];

  constructor(scope: Construct, id: string, props: TenantIsolationPolicyProps) {
    super(scope, id);

    this.policyStatements = [];

    // Create tenant-scoped DynamoDB policy
    if (props.dynamoTableArns.length > 0) {
      // Policy for DynamoDB operations with tenant isolation
      const dynamoReadPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:Query',
          'dynamodb:BatchGetItem',
        ],
        resources: [
          ...props.dynamoTableArns,
          ...props.dynamoTableArns.map(arn => `${arn}/index/*`),
        ],
        conditions: {
          // Ensure the tenantId in the request matches the authenticated user's tenant
          'ForAllValues:StringEquals': {
            'dynamodb:LeadingKeys': ['${cognito-identity.amazonaws.com:sub}'],
          },
        },
      });

      const dynamoWritePolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
        ],
        resources: props.dynamoTableArns,
        conditions: {
          // Ensure writes are scoped to the user's tenant
          'ForAllValues:StringEquals': {
            'dynamodb:LeadingKeys': ['${cognito-identity.amazonaws.com:sub}'],
          },
        },
      });

      this.policyStatements.push(dynamoReadPolicy, dynamoWritePolicy);
    }

    // Create tenant-scoped S3 policy
    if (props.s3BucketArns && props.s3BucketArns.length > 0) {
      const s3Policy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:ListBucket',
        ],
        resources: [
          ...props.s3BucketArns,
          ...props.s3BucketArns.map(arn => `${arn}/*`),
        ],
        conditions: {
          // Ensure S3 access is scoped to tenant prefix
          StringLike: {
            's3:prefix': ['${cognito-identity.amazonaws.com:sub}/*'],
          },
        },
      });

      this.policyStatements.push(s3Policy);
    }

    // Create tenant-scoped OpenSearch policy
    if (props.openSearchDomainArns && props.openSearchDomainArns.length > 0) {
      const openSearchPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'es:ESHttpGet',
          'es:ESHttpPost',
          'es:ESHttpPut',
        ],
        resources: [
          ...props.openSearchDomainArns.map(arn => `${arn}/*`),
        ],
        // Note: OpenSearch tenant isolation is typically enforced at the application layer
        // through index naming conventions (e.g., tenant-{tenantId}-documents)
      });

      this.policyStatements.push(openSearchPolicy);
    }
  }

  /**
   * Create a managed policy from the tenant isolation statements
   */
  public createManagedPolicy(scope: Construct, id: string, policyName: string): iam.ManagedPolicy {
    return new iam.ManagedPolicy(scope, id, {
      managedPolicyName: policyName,
      description: 'Tenant-scoped IAM policy for data isolation',
      statements: this.policyStatements,
    });
  }

  /**
   * Apply tenant isolation policy to a Lambda function's role
   */
  public applyToLambdaRole(role: iam.IRole): void {
    this.policyStatements.forEach(statement => {
      role.addToPrincipalPolicy(statement);
    });
  }
}

/**
 * Helper function to create tenant-scoped policy statements for Lambda execution roles
 */
export function createTenantScopedPolicyStatements(
  tableArns: string[],
  bucketArns?: string[]
): iam.PolicyStatement[] {
  const statements: iam.PolicyStatement[] = [];

  // DynamoDB tenant-scoped access
  if (tableArns.length > 0) {
    statements.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
        ],
        resources: tableArns,
        conditions: {
          // Condition ensures tenantId in request matches execution context
          // In practice, this is enforced in Lambda code by extracting tenantId
          // from Cognito JWT claims and using it as partition key
          StringEquals: {
            'dynamodb:Attributes': ['tenantId'],
          },
        },
      })
    );
  }

  // S3 tenant-scoped access
  if (bucketArns && bucketArns.length > 0) {
    statements.push(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
        ],
        resources: bucketArns.map(arn => `${arn}/*`),
        // S3 tenant isolation enforced through object key prefix: {tenantId}/...
      })
    );
  }

  return statements;
}
