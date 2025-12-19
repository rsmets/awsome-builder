import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for OrchestrationStack
 */
export interface OrchestrationStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
  /** KMS key for encryption */
  readonly kmsKey: kms.IKey;
}

/**
 * OrchestrationStack provides workflow and event management:
 * - EventBridge event bus and rules
 * - SNS topic for alerts and escalations
 * 
 * Requirements: 4.3, 4.4, 8.1
 */
export class OrchestrationStack extends cdk.Stack {
  /** EventBridge event bus */
  public readonly eventBus: events.EventBus;
  /** SNS topic for alerts */
  public readonly alertTopic: sns.Topic;
  /** EventBridge rule for document uploads */
  public readonly documentUploadRule: events.Rule;

  constructor(scope: Construct, id: string, props: OrchestrationStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;
    const removalPolicy = this.getRemovalPolicy(config.removalPolicy);

    // Create custom EventBridge event bus
    this.eventBus = new events.EventBus(this, 'EventBus', {
      eventBusName: `${namePrefix}-event-bus`,
    });

    // Create SNS topic for alerts and escalations with KMS encryption
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${namePrefix}-alerts`,
      displayName: 'FlowOps Alerts and Escalations',
      masterKey: props.kmsKey,
    });

    // Create EventBridge rule for S3 document upload events
    this.documentUploadRule = new events.Rule(this, 'DocumentUploadRule', {
      ruleName: `${namePrefix}-document-upload`,
      description: 'Trigger document ingestion on S3 object creation',
      eventBus: this.eventBus,
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [{ prefix: namePrefix }],
          },
        },
      },
      enabled: true,
    });

    // Archive events for replay capability
    new events.Archive(this, 'EventArchive', {
      sourceEventBus: this.eventBus,
      archiveName: `${namePrefix}-event-archive`,
      description: 'Archive FlowOps events for replay',
      retention: cdk.Duration.days(30),
      eventPattern: {
        source: ['flowops'],
      },
    });

    // Create CloudFormation outputs
    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      description: 'EventBridge event bus ARN',
      exportName: `${namePrefix}-event-bus-arn`,
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: this.eventBus.eventBusName,
      description: 'EventBridge event bus name',
      exportName: `${namePrefix}-event-bus-name`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS topic ARN for alerts',
      exportName: `${namePrefix}-alert-topic-arn`,
    });

    new cdk.CfnOutput(this, 'AlertTopicName', {
      value: this.alertTopic.topicName,
      description: 'SNS topic name for alerts',
      exportName: `${namePrefix}-alert-topic-name`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'FlowOps');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Stack', 'Orchestration');
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
