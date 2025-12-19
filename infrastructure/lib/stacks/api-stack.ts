import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { FlowOpsConfig } from '../../config';

/**
 * Properties for APIStack
 */
export interface APIStackProps extends cdk.StackProps {
  /** FlowOps configuration */
  readonly config: FlowOpsConfig;
  /** Cognito User Pool for authorization */
  readonly userPool: cognito.IUserPool;
  /** Agent Invoke Lambda function */
  readonly agentInvokeFunction: lambda.IFunction;
  /** Safe Actions Lambda function */
  readonly safeActionsFunction: lambda.IFunction;
}

/**
 * APIStack provides API Gateway layer:
 * - REST API with Cognito authorizer
 * - Lambda integrations for agent and actions
 * - CORS and throttling configuration
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export class APIStack extends cdk.Stack {
  /** REST API */
  public readonly restApi: apigateway.RestApi;
  /** API endpoint URL */
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);

    const { config } = props;
    const namePrefix = `flowops-${config.environment}`;

    // Create Cognito authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      authorizerName: `${namePrefix}-cognito-authorizer`,
      identitySource: 'method.request.header.Authorization',
    });

    // Create REST API with request validation
    this.restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${namePrefix}-api`,
      description: `FlowOps ${config.environment} REST API`,
      deployOptions: {
        stageName: config.environment,
        tracingEnabled: true, // Enable X-Ray tracing
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        throttlingBurstLimit: config.apiGateway.burstLimit,
        throttlingRateLimit: config.apiGateway.rateLimit,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Should be restricted in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Tenant-Id',
        ],
        allowCredentials: true,
      },
      // Enforce TLS 1.2
      policy: new cdk.aws_iam.PolicyDocument({
        statements: [
          new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.DENY,
            principals: [new cdk.aws_iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*'],
            conditions: {
              StringNotEquals: {
                'aws:SecureTransport': 'true',
              },
            },
          }),
        ],
      }),
    });

    // Create request validators
    const bodyValidator = new apigateway.RequestValidator(this, 'BodyValidator', {
      restApi: this.restApi,
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    const paramsValidator = new apigateway.RequestValidator(this, 'ParamsValidator', {
      restApi: this.restApi,
      requestValidatorName: 'params-validator',
      validateRequestBody: false,
      validateRequestParameters: true,
    });

    // Create Lambda integrations
    const agentInvokeIntegration = new apigateway.LambdaIntegration(props.agentInvokeFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    const safeActionsIntegration = new apigateway.LambdaIntegration(props.safeActionsFunction, {
      proxy: true,
      allowTestInvoke: true,
    });

    // Create /chat endpoint
    const chatResource = this.restApi.root.addResource('chat');
    chatResource.addMethod('POST', agentInvokeIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: bodyValidator,
    });

    // Create /actions/{type} endpoint
    const actionsResource = this.restApi.root.addResource('actions');
    const actionTypeResource = actionsResource.addResource('{type}');
    actionTypeResource.addMethod('POST', safeActionsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: bodyValidator,
      requestParameters: {
        'method.request.path.type': true,
      },
    });

    // Create usage plan with throttling
    const usagePlan = this.restApi.addUsagePlan('UsagePlan', {
      name: `${namePrefix}-usage-plan`,
      description: 'Usage plan with rate limiting per tenant',
      throttle: {
        rateLimit: config.apiGateway.rateLimit,
        burstLimit: config.apiGateway.burstLimit,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.DAY,
      },
    });

    usagePlan.addApiStage({
      stage: this.restApi.deploymentStage,
    });

    this.apiUrl = this.restApi.url;

    // Create CloudFormation outputs
    new cdk.CfnOutput(this, 'RestApiId', {
      value: this.restApi.restApiId,
      description: 'REST API ID',
      exportName: `${namePrefix}-rest-api-id`,
    });

    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: this.apiUrl,
      description: 'REST API endpoint URL',
      exportName: `${namePrefix}-rest-api-url`,
    });

    new cdk.CfnOutput(this, 'RestApiRootResourceId', {
      value: this.restApi.restApiRootResourceId,
      description: 'REST API root resource ID',
      exportName: `${namePrefix}-rest-api-root-resource-id`,
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'FlowOps');
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Stack', 'API');
  }
}
