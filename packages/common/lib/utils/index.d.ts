/**
 * Generates a unique ID with optional prefix
 */
export declare function generateId(prefix?: string): string;
/**
 * Creates a tenant-scoped partition key
 */
export declare function tenantKey(tenantId: string): string;
/**
 * Creates a ticket sort key
 */
export declare function ticketKey(ticketId: string): string;
/**
 * Creates a conversation sort key
 */
export declare function conversationKey(conversationId: string, messageId?: string): string;
//# sourceMappingURL=index.d.ts.map