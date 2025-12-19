export interface Ticket {
  tenantId: string;
  ticketId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  description: string;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  severity: number; // 1-5
  slaRisk: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  conversationIds: string[];
  aiSummary?: string;
}
