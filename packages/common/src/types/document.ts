export interface Document {
  tenantId: string;
  documentId: string;
  title: string;
  s3Key: string;
  contentType: string;
  status: 'pending' | 'approved' | 'rejected' | 'indexed';
  version: number;
  chunkCount: number;
  embeddingStatus: 'pending' | 'complete' | 'failed';
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface VectorEmbedding {
  embeddingId: string;
  tenantId: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  vector: number[]; // 1536 dimensions
  metadata: {
    title: string;
    section?: string;
    pageNumber?: number;
  };
}
