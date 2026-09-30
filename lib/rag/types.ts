export type RagChunk = {
  id: string;
  documentId: string;
  title: string;
  text: string;
  location: string;
  index: number;
};

export type ChunkableDocument = {
  id: string;
  title: string;
  content?: string;
};

export type RetrievedChunk = RagChunk & {
  score: number;
};

export type RetrievalResult = {
  chunks: RetrievedChunk[];
  strategy: "vector" | "lexical";
};

export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface DocumentChunker {
  chunk(documents: ChunkableDocument[]): RagChunk[];
}
