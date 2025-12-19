import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { IConstruct } from 'constructs';

/**
 * CDK Aspect to validate encryption on all storage resources
 * 
 * Requirements: 5.2
 */
export class EncryptionValidationAspect implements cdk.IAspect {
  public visit(node: IConstruct): void {
    // Validate S3 bucket encryption
    if (node instanceof s3.CfnBucket) {
      if (!node.bucketEncryption) {
        cdk.Annotations.of(node).addError(
          'S3 bucket must have encryption enabled'
        );
      }
    }

    // Validate DynamoDB table encryption
    if (node instanceof dynamodb.CfnTable) {
      if (!node.sseSpecification || !node.sseSpecification.sseEnabled) {
        cdk.Annotations.of(node).addError(
          'DynamoDB table must have encryption at rest enabled'
        );
      }
    }
  }
}

/**
 * CDK Aspect to validate tagging standards
 * 
 * Requirements: 5.2
 */
export class TaggingValidationAspect implements cdk.IAspect {
  private readonly requiredTags: string[];

  constructor(requiredTags: string[] = ['Project', 'Environment']) {
    this.requiredTags = requiredTags;
  }

  public visit(node: IConstruct): void {
    // Only check taggable resources
    if (cdk.TagManager.isTaggable(node)) {
      const tags = cdk.Tags.of(node);
      const renderedTags = tags.renderTags();

      for (const requiredTag of this.requiredTags) {
        if (!renderedTags || !renderedTags[requiredTag]) {
          cdk.Annotations.of(node).addWarning(
            `Resource should have required tag: ${requiredTag}`
          );
        }
      }
    }
  }
}

/**
 * CDK Aspect to validate removal policies
 */
export class RemovalPolicyValidationAspect implements cdk.IAspect {
  private readonly environment: string;

  constructor(environment: string) {
    this.environment = environment;
  }

  public visit(node: IConstruct): void {
    // Check S3 buckets
    if (node instanceof s3.CfnBucket) {
      const bucket = node as any;
      if (this.environment === 'prod' && !bucket.deletionPolicy) {
        cdk.Annotations.of(node).addWarning(
          'Production S3 bucket should have explicit deletion policy'
        );
      }
    }

    // Check DynamoDB tables
    if (node instanceof dynamodb.CfnTable) {
      const table = node as any;
      if (this.environment === 'prod' && !table.deletionPolicy) {
        cdk.Annotations.of(node).addWarning(
          'Production DynamoDB table should have explicit deletion policy'
        );
      }
    }
  }
}

/**
 * CDK Aspect to validate KMS key usage
 */
export class KmsKeyValidationAspect implements cdk.IAspect {
  public visit(node: IConstruct): void {
    // Validate KMS keys have rotation enabled
    if (node instanceof kms.CfnKey) {
      if (!node.enableKeyRotation) {
        cdk.Annotations.of(node).addWarning(
          'KMS key should have automatic key rotation enabled'
        );
      }
    }
  }
}

/**
 * Composite aspect that applies all validation aspects
 */
export class FlowOpsValidationAspect implements cdk.IAspect {
  private readonly aspects: cdk.IAspect[];

  constructor(environment: string, requiredTags?: string[]) {
    this.aspects = [
      new EncryptionValidationAspect(),
      new TaggingValidationAspect(requiredTags),
      new RemovalPolicyValidationAspect(environment),
      new KmsKeyValidationAspect(),
    ];
  }

  public visit(node: IConstruct): void {
    this.aspects.forEach(aspect => aspect.visit(node));
  }
}
