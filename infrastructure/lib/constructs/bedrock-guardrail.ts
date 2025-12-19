import * as cdk from 'aws-cdk-lib';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import { Construct } from 'constructs';

/**
 * Properties for BedrockGuardrail construct
 */
export interface BedrockGuardrailProps {
  /** Guardrail name */
  readonly name: string;
  /** Description of the guardrail */
  readonly description: string;
  /** KMS key ARN for encryption */
  readonly kmsKeyArn?: string;
}

/**
 * Bedrock Guardrail construct for content filtering and safety:
 * - Content filters for harmful content
 * - Denied topics (personal advice, medical/legal)
 * - PII handling and anonymization
 * 
 * Requirements: 2.4
 */
export class BedrockGuardrail extends Construct {
  /** The Bedrock Guardrail */
  public readonly guardrail: bedrock.CfnGuardrail;
  /** Guardrail ID */
  public readonly guardrailId: string;
  /** Guardrail ARN */
  public readonly guardrailArn: string;

  constructor(scope: Construct, id: string, props: BedrockGuardrailProps) {
    super(scope, id);

    // Create Bedrock Guardrail
    this.guardrail = new bedrock.CfnGuardrail(this, 'Guardrail', {
      name: props.name,
      description: props.description,
      blockedInputMessaging: 'I cannot provide assistance with that request as it violates our content policy.',
      blockedOutputsMessaging: 'I cannot provide that response as it contains content that violates our safety guidelines.',
      
      // Content filters for harmful content
      contentPolicyConfig: {
        filtersConfig: [
          {
            type: 'HATE',
            inputStrength: 'HIGH',
            outputStrength: 'HIGH',
          },
          {
            type: 'VIOLENCE',
            inputStrength: 'HIGH',
            outputStrength: 'HIGH',
          },
          {
            type: 'SEXUAL',
            inputStrength: 'HIGH',
            outputStrength: 'HIGH',
          },
          {
            type: 'INSULTS',
            inputStrength: 'MEDIUM',
            outputStrength: 'MEDIUM',
          },
          {
            type: 'MISCONDUCT',
            inputStrength: 'MEDIUM',
            outputStrength: 'MEDIUM',
          },
        ],
      },

      // Denied topics configuration
      topicPolicyConfig: {
        topicsConfig: [
          {
            name: 'PersonalAdvice',
            definition: 'Personal life advice, relationship advice, or personal decision-making guidance',
            examples: [
              'Should I break up with my partner?',
              'What should I do with my life?',
              'How do I deal with family issues?',
            ],
            type: 'DENY',
          },
          {
            name: 'MedicalAdvice',
            definition: 'Medical diagnosis, treatment recommendations, or health advice',
            examples: [
              'What medication should I take for this symptom?',
              'Do I have a medical condition?',
              'Should I see a doctor?',
            ],
            type: 'DENY',
          },
          {
            name: 'LegalAdvice',
            definition: 'Legal guidance, interpretation of laws, or legal recommendations',
            examples: [
              'What are my legal rights in this situation?',
              'Should I sue someone?',
              'How do I interpret this contract?',
            ],
            type: 'DENY',
          },
        ],
      },

      // Word filters for competitor names and profanity
      wordPolicyConfig: {
        wordsConfig: [
          { text: 'CompetitorA' },
          { text: 'CompetitorB' },
          { text: 'CompetitorC' },
        ],
        managedWordListsConfig: [
          { type: 'PROFANITY' },
        ],
      },

      // PII handling - anonymize in responses
      sensitiveInformationPolicyConfig: {
        piiEntitiesConfig: [
          { type: 'EMAIL', action: 'ANONYMIZE' },
          { type: 'PHONE', action: 'ANONYMIZE' },
          { type: 'NAME', action: 'ANONYMIZE' },
          { type: 'ADDRESS', action: 'ANONYMIZE' },
          { type: 'SSN', action: 'BLOCK' },
          { type: 'CREDIT_DEBIT_CARD_NUMBER', action: 'BLOCK' },
          { type: 'PASSWORD', action: 'BLOCK' },
          { type: 'AWS_ACCESS_KEY', action: 'BLOCK' },
          { type: 'AWS_SECRET_KEY', action: 'BLOCK' },
        ],
      },

      kmsKeyArn: props.kmsKeyArn,
    });

    this.guardrailId = this.guardrail.attrGuardrailId;
    this.guardrailArn = this.guardrail.attrGuardrailArn;

    // Add tags
    cdk.Tags.of(this.guardrail).add('Component', 'Bedrock');
    cdk.Tags.of(this.guardrail).add('Purpose', 'ContentSafety');
  }
}
