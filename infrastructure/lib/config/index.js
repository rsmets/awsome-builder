"use strict";
// FlowOps Environment Configuration
// Provides type-safe configuration for different environments
Object.defineProperty(exports, "__esModule", { value: true });
exports.prodConfig = exports.stagingConfig = exports.devConfig = void 0;
exports.getConfig = getConfig;
const dev_1 = require("./dev");
const staging_1 = require("./staging");
const prod_1 = require("./prod");
const configs = {
    dev: dev_1.devConfig,
    staging: staging_1.stagingConfig,
    prod: prod_1.prodConfig,
};
/**
 * Get configuration for the specified environment
 */
function getConfig(environment) {
    const config = configs[environment];
    if (!config) {
        throw new Error(`Unknown environment: ${environment}`);
    }
    return config;
}
var dev_2 = require("./dev");
Object.defineProperty(exports, "devConfig", { enumerable: true, get: function () { return dev_2.devConfig; } });
var staging_2 = require("./staging");
Object.defineProperty(exports, "stagingConfig", { enumerable: true, get: function () { return staging_2.stagingConfig; } });
var prod_2 = require("./prod");
Object.defineProperty(exports, "prodConfig", { enumerable: true, get: function () { return prod_2.prodConfig; } });
//# sourceMappingURL=index.js.map