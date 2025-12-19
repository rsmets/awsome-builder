import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for ObservabilityStack
 */
export interface ObservabilityStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
  /** SNS topic for alarm notifications */
  readonly alertTopic: sns.ITopic;
  /** Agent Invoke Lambda function */
  readonly agentInvokeFunction?: lambda.IFunction;
  /** Safe Actions Lambda function */
  readonly safeActionsFunction?: lambda.IFunction;
  /** REST API ID for monitoring */
  readonly restApiId?: string;
  /** OpenSearch domain endpoint for monitoring */
  readonly openSearchDomainName?: string;
}

/**
 * ObservabilityStack provides monitoring and alerting:
 * - CloudWatch dashboard with key metrics
 * - CloudWatch alarms for critical metrics
 * 
 * Requirements: 6.4, 6.5
 */
export class ObservabilityStack extends cdk.Stack {
  /** CloudWatch dashboard */
  public readonly dashboard: cloudwatch.Dashboard;
  /** Error rate alarm */
  public readonly errorRateAlarm: cloudwatch.Alarm;
  /** Latency alarm */
  public readonly latencyAlarm: cloudwatch.Alarm;
  /** Bedrock throttling alarm */
  public readonly bedrockThrottlingAlarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;

    // Create CloudWatch dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${namePrefix}-dashboard`,
    });

    // Lambda metrics widgets (if functions are provided)
    if (props.agentInvokeFunction) {
      this.addLambdaMetrics(props.agentInvokeFunction, 'Agent Invoke');
    }
    if (props.safeActionsFunction) {
      this.addLambdaMetrics(props.safeActionsFunction, 'Safe Actions');
    }

    // API Gateway metrics (if API is provided)
    if (props.restApiId) {
      this.addApiGatewayMetrics(props.restApiId, config.environment);
    }

    // Bedrock metrics widget
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Bedrock Invocations',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Bedrock',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Bedrock',
            metricName: 'InvocationLatency',
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      }),
    );

    // Create CloudWatch alarms

    // 1. Error rate alarm (> 1% for 5 minutes)
    this.errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
      alarmName: `${namePrefix}-error-rate`,
      alarmDescription: 'Alert when error rate exceeds 1% for 5 minutes',
      metric: new cloudwatch.MathExpression({
        expression: '(errors / invocations) * 100',
        usingMetrics: {
          errors: this.createLambdaErrorMetric(props.agentInvokeFunction),
          invocations: this.createLambdaInvocationMetric(props.agentInvokeFunction),
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    this.errorRateAlarm.addAlarmAction(new actions.SnsAction(props.alertTopic));

    // 2. P99 latency alarm (> 10 seconds)
    if (props.agentInvokeFunction) {
      this.latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
        alarmName: `${namePrefix}-p99-latency`,
        alarmDescription: 'Alert when P99 latency exceeds 10 seconds',
        metric: props.agentInvokeFunction.metricDuration({
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10000, // 10 seconds in milliseconds
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      this.latencyAlarm.addAlarmAction(new actions.SnsAction(props.alertTopic));
    } else {
      // Create a placeholder alarm if function not provided
      this.latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
        alarmName: `${namePrefix}-p99-latency-placeholder`,
        alarmDescription: 'Placeholder latency alarm',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'p99',
        }),
        threshold: 10000,
        evaluationPeriods: 2,
      });
    }

    // 3. Bedrock throttling alarm
    this.bedrockThrottlingAlarm = new cloudwatch.Alarm(this, 'BedrockThrottlingAlarm', {
      alarmName: `${namePrefix}-bedrock-throttling`,
      alarmDescription: 'Alert when Bedrock requests are throttled',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Bedrock',
        metricName: 'ModelInvocationThrottles',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    this.bedrockThrottlingAlarm.addAlarmAction(new actions.SnsAction(props.alertTopic));

    // 4. OpenSearch cluster health alarm (if provided)
    if (props.openSearchDomainName) {
      const clusterHealthAlarm = new cloudwatch.Alarm(this, 'OpenSearchHealthAlarm', {
        alarmName: `${namePrefix}-opensearch-health`,
        alarmDescription: 'Alert when OpenSearch cluster health is yellow or red',
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ES',
          metricName: 'ClusterStatus.yellow',
          statistic: 'Maximum',
          period: cdk.Duration.minutes(1),
          dimensionsMap: {
            DomainName: props.openSearchDomainName,
            ClientId: this.account,
          },
        }),
        threshold: 1,
        evaluationPeriods: 5,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });

      clusterHealthAlarm.addAlarmAction(new actions.SnsAction(props.alertTopic));
    }

    // Create CloudFormation outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch dashboard URL',
    });

    new cdk.CfnOutput(this, 'ErrorRateAlarmArn', {
      value: this.errorRateAlarm.alarmArn,
      description: 'Error rate alarm ARN',
      exportName: `${namePrefix}-error-rate-alarm-arn`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'FlowOps');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Stack', 'Observability');
  }

  /**
   * Add Lambda function metrics to dashboard
   */
  private addLambdaMetrics(func: lambda.IFunction, title: string): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: `${title} - Invocations & Errors`,
        left: [func.metricInvocations({ statistic: 'Sum' })],
        right: [func.metricErrors({ statistic: 'Sum' })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: `${title} - Duration`,
        left: [
          func.metricDuration({ statistic: 'Average' }),
          func.metricDuration({ statistic: 'p99' }),
        ],
        width: 12,
      }),
    );
  }

  /**
   * Add API Gateway metrics to dashboard
   */
  private addApiGatewayMetrics(apiId: string, stage: string): void {
    const apiMetric = (metricName: string, stat = 'Sum') =>
      new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName,
        statistic: stat,
        period: cdk.Duration.minutes(5),
        dimensionsMap: {
          ApiId: apiId,
          Stage: stage,
        },
      });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Requests & Errors',
        left: [apiMetric('Count')],
        right: [apiMetric('4XXError'), apiMetric('5XXError')],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          apiMetric('Latency', 'Average'),
          apiMetric('Latency', 'p99'),
        ],
        width: 12,
      }),
    );
  }

  /**
   * Create Lambda error metric
   */
  private createLambdaErrorMetric(func?: lambda.IFunction): cloudwatch.IMetric {
    if (func) {
      return func.metricErrors({ statistic: 'Sum', period: cdk.Duration.minutes(5) });
    }
    return new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
  }

  /**
   * Create Lambda invocation metric
   */
  private createLambdaInvocationMetric(func?: lambda.IFunction): cloudwatch.IMetric {
    if (func) {
      return func.metricInvocations({ statistic: 'Sum', period: cdk.Duration.minutes(5) });
    }
    return new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Invocations',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
  }
}
