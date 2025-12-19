#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.envName = exports.config = exports.awsEnv = void 0;
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const config_1 = require("../config");
const app = new cdk.App();
// Get environment from context or default to 'dev'
const envName = app.node.tryGetContext('env') || 'dev';
exports.envName = envName;
const config = (0, config_1.getConfig)(envName);
exports.config = config;
// Define AWS environment for stack deployment
exports.awsEnv = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region,
};
// Tags applied to all resources
const tags = {
    Project: 'FlowOps',
    Environment: envName,
    ManagedBy: 'CDK',
};
// Apply tags to all resources in the app
Object.entries(tags).forEach(([key, value]) => {
    cdk.Tags.of(app).add(key, value);
});
// Stacks will be added here as they are implemented
// Example:
// new FoundationStack(app, `FlowOps-Foundation-${envName}`, {
//   env: awsEnv,
//   config,
// });
app.synth();
//# sourceMappingURL=app.js.map