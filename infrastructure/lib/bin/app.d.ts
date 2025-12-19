#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Environment } from '../config';
declare const envName: Environment;
declare const config: import("../config").FlowOpsConfig;
export declare const awsEnv: cdk.Environment;
export { config, envName };
//# sourceMappingURL=app.d.ts.map