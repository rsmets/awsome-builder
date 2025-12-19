// FlowOps Common Utilities

/**
 * Generates a unique ID with optional prefix
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

/**
 * Creates a tenant-scoped partition key
 */
export function tenantKey(tenantId: string): string {
  return `TENANT#${tenantId}`;
}

/**
 * Creates a ticket sort key
 */
export function ticketKey(ticketId: string): string {
  return `TICKET#${ticketId}`;
}

/**
 * Creates a conversation sort key
 */
export function conversationKey(conversationId: string, messageId?: string): string {
  if (messageId) {
    return `CONV#${conversationId}#MSG#${messageId}`;
  }
  return `CONV#${conversationId}`;
}
