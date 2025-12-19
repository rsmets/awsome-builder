import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Properties for BaseLambda construct
 */
export interface BaseLambdaProps {
  /** Function name */
  readonly functionName: string;
  /** Description of the Lambda function */
  readonly description: string;
  /** Runtime environment */
  readonly runtime?: lambda.Runtime;
  /** Handler function path */
  readonly handler: string;
  /** Code location */
  readonly code: lambda.Code;
  /** Memory size in MB */
  readonly memorySize: number;
  /** Timeout in seconds */
  readonly timeout: cdk.Duration;
  /** Environment variables */
  readonly environment?: Record<string, string>;
  /** VPC configuration (optional) */
  readonly vpc?: ec2.IVpc;
  /** VPC subnets (optional) */
  readonly vpcSubnets?: ec2.SubnetSelection;
  /** Log retention in days */
  readonly logRetentionDays: number;
  /** Removal policy */
  readonly removalPolicy: cdk.RemovalPolicy;
}

/**
 * Base Lambda construct with common configuration:
 * - X-Ray tracing enabled
 * - CloudWatch log group with retention
 * - Environment variables
 * - Optional VPC placement
 * 
 * Requirements: 6.1, 6.2
 */
export class BaseLambda extends Construct {
  /** The Lambda function */
  public readonly function: lambda.Function;
  /** The CloudWatch log group */
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: BaseLambdaProps) {
    super(scope, id);

    // Create CloudWatch log group with retention
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${props.functionName}`,
      retention: this.getLogRetention(props.logRetentionDays),
      removalPolicy: props.removalPolicy,
    });

    // Create Lambda function with standard configuration
    this.function = new lambda.Function(this, 'Function', {
      functionName: props.functionName,
      description: props.description,
      runtime: props.runtime || lambda.Runtime.NODEJS_18_X,
      handler: props.handler,
      code: props.code,
      memorySize: props.memorySize,
      timeout: props.timeout,
      environment: props.environment,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      logGroup: this.logGroup,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      // Additional best practices
      reservedConcurrentExecutions: undefined, // Allow scaling
      architecture: lambda.Architecture.ARM_64, // Use ARM for cost optimization
    });

    // Add tags
    cdk.Tags.of(this.function).add('Component', 'Lambda');
    cdk.Tags.of(this.function).add('Observability', 'Enabled');
  }

  /**
   * Convert retention days to RetentionDays enum
   */
  private getLogRetention(days: number): logs.RetentionDays {
    switch (days) {
      case 1:
        return logs.RetentionDays.ONE_DAY;
      case 3:
        return logs.RetentionDays.THREE_DAYS;
      case 5:
        return logs.RetentionDays.FIVE_DAYS;
      case 7:
        return logs.RetentionDays.ONE_WEEK;
      case 14:
        return logs.RetentionDays.TWO_WEEKS;
      case 30:
        return logs.RetentionDays.ONE_MONTH;
      case 60:
        return logs.RetentionDays.TWO_MONTHS;
      case 90:
        return logs.RetentionDays.THREE_MONTHS;
      case 120:
        return logs.RetentionDays.FOUR_MONTHS;
      case 150:
        return logs.RetentionDays.FIVE_MONTHS;
      case 180:
        return logs.RetentionDays.SIX_MONTHS;
      case 365:
        return logs.RetentionDays.ONE_YEAR;
      case 400:
        return logs.RetentionDays.THIRTEEN_MONTHS;
      case 545:
        return logs.RetentionDays.EIGHTEEN_MONTHS;
      case 731:
        return logs.RetentionDays.TWO_YEARS;
      case 1827:
        return logs.RetentionDays.FIVE_YEARS;
      case 3653:
        return logs.RetentionDays.TEN_YEARS;
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
  }
}
