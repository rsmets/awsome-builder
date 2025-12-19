#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getConfig, Environment } from '../config';

const app = new cdk.App();

// Get environment from context or default to 'dev'
const envName = (app.node.tryGetContext('env') as Environment) || 'dev';
const config = getConfig(envName);

// Define AWS environment for stack deployment
export const awsEnv: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region,
};

// Tags applied to all resources
const tags: Record<string, string> = {
  Project: 'FlowOps',
  Environment: envName,
  ManagedBy: 'CDK',
};

// Apply tags to all resources in the app
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

// Export config for use by stacks
export { config, envName };

// Stacks will be added here as they are implemented
// Example:
// new FoundationStack(app, `FlowOps-Foundation-${envName}`, {
//   env: awsEnv,
//   config,
// });

app.synth();
