"use strict";
// FlowOps Common Utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.tenantKey = tenantKey;
exports.ticketKey = ticketKey;
exports.conversationKey = conversationKey;
/**
 * Generates a unique ID with optional prefix
 */
function generateId(prefix) {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}
/**
 * Creates a tenant-scoped partition key
 */
function tenantKey(tenantId) {
    return `TENANT#${tenantId}`;
}
/**
 * Creates a ticket sort key
 */
function ticketKey(ticketId) {
    return `TICKET#${ticketId}`;
}
/**
 * Creates a conversation sort key
 */
function conversationKey(conversationId, messageId) {
    if (messageId) {
        return `CONV#${conversationId}#MSG#${messageId}`;
    }
    return `CONV#${conversationId}`;
}
//# sourceMappingURL=index.js.map