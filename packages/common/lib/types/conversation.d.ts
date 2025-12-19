export interface Citation {
    documentId: string;
    documentTitle: string;
    snippet: string;
    relevanceScore: number;
}
export interface Message {
    messageId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citations?: Citation[];
    confidence?: number;
    timestamp: string;
}
export interface Conversation {
    tenantId: string;
    conversationId: string;
    ticketId?: string;
    messages: Message[];
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=conversation.d.ts.map