import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BedrockGuardrail } from '../constructs/bedrock-guardrail';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for AIStack
 */
export interface AIStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
  /** KMS key ARN for encryption */
  readonly kmsKeyArn: string;
}

/**
 * AIStack provides Bedrock configuration and guardrails:
 * - Bedrock model access (Claude 3 Sonnet, Titan Embeddings)
 * - Bedrock Guardrail for content filtering
 * - IAM roles for model access
 * 
 * Requirements: 2.2, 2.4
 */
export class AIStack extends cdk.Stack {
  /** Bedrock Guardrail */
  public readonly guardrail: BedrockGuardrail;
  /** Guardrail ID */
  public readonly guardrailId: string;
  /** Guardrail ARN */
  public readonly guardrailArn: string;
  /** Model ID for text generation */
  public readonly modelId: string;
  /** Model ID for embeddings */
  public readonly embeddingModelId: string;

  constructor(scope: Construct, id: string, props: AIStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;

    // Store model IDs from config
    this.modelId = config.bedrock.modelId;
    this.embeddingModelId = config.bedrock.embeddingModelId;

    // Create Bedrock Guardrail
    this.guardrail = new BedrockGuardrail(this, 'Guardrail', {
      name: `${namePrefix}-guardrail`,
      description: `FlowOps ${config.environment} guardrail for content filtering and safety`,
      kmsKeyArn: props.kmsKeyArn,
    });

    this.guardrailId = this.guardrail.guardrailId;
    this.guardrailArn = this.guardrail.guardrailArn;

    // Note: Bedrock model access is configured at the account level via the AWS Console
    // or AWS CLI. CDK does not support enabling model access programmatically.
    // However, we can create IAM policies for model access that will be used by Lambda functions.

    // Create a managed policy for Bedrock model access
    const bedrockAccessPolicy = new iam.ManagedPolicy(this, 'BedrockAccessPolicy', {
      managedPolicyName: `${namePrefix}-bedrock-access`,
      description: 'Policy for accessing Bedrock models (Claude 3 Sonnet and Titan Embeddings)',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'bedrock:InvokeModel',
            'bedrock:InvokeModelWithResponseStream',
          ],
          resources: [
            // Claude 3 Sonnet
            `arn:aws:bedrock:${this.region}::foundation-model/${this.modelId}`,
            // Titan Embed Text v2
            `arn:aws:bedrock:${this.region}::foundation-model/${this.embeddingModelId}`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'bedrock:ApplyGuardrail',
          ],
          resources: [this.guardrailArn],
        }),
      ],
    });

    // Create CloudFormation outputs
    new cdk.CfnOutput(this, 'GuardrailId', {
      value: this.guardrailId,
      description: 'Bedrock Guardrail ID',
      exportName: `${namePrefix}-guardrail-id`,
    });

    new cdk.CfnOutput(this, 'GuardrailArn', {
      value: this.guardrailArn,
      description: 'Bedrock Guardrail ARN',
      exportName: `${namePrefix}-guardrail-arn`,
    });

    new cdk.CfnOutput(this, 'ModelId', {
      value: this.modelId,
      description: 'Bedrock model ID for text generation',
      exportName: `${namePrefix}-model-id`,
    });

    new cdk.CfnOutput(this, 'EmbeddingModelId', {
      value: this.embeddingModelId,
      description: 'Bedrock model ID for embeddings',
      exportName: `${namePrefix}-embedding-model-id`,
    });

    new cdk.CfnOutput(this, 'BedrockAccessPolicyArn', {
      value: bedrockAccessPolicy.managedPolicyArn,
      description: 'IAM policy ARN for Bedrock model access',
      exportName: `${namePrefix}-bedrock-access-policy-arn`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'FlowOps');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Stack', 'AI');

    // Add informational output about manual model access configuration
    new cdk.CfnOutput(this, 'ModelAccessNote', {
      value: 'Bedrock model access must be manually enabled in the AWS Console or via AWS CLI',
      description: 'Important: Enable model access for Claude 3 Sonnet and Titan Embeddings',
    });
  }
}
