import { cosineSimilarity, lexicalSimilarity } from "./similarity.ts";
import type {
  EmbeddingProvider,
  RagChunk,
  RetrievalResult,
  RetrievedChunk,
} from "./types";

type RetrieverOptions = {
  limit?: number;
  minimumScore?: number;
};

type WarningLogger = Pick<Console, "warn">;

function selectBest(
  chunks: RagChunk[],
  scores: number[],
  limit: number,
  minimumScore: number,
) {
  const ranked = chunks
    .map((chunk, index): RetrievedChunk => ({
      ...chunk,
      score: scores[index] ?? 0,
    }))
    .sort((left, right) => right.score - left.score);

  const relevant = ranked.filter((chunk) => chunk.score >= minimumScore);
  return (relevant.length ? relevant : ranked).slice(0, limit);
}

export class HybridRetriever {
  private readonly provider: EmbeddingProvider;
  private readonly limit: number;
  private readonly minimumScore: number;
  private readonly logger: WarningLogger;

  constructor(
    provider: EmbeddingProvider,
    options: RetrieverOptions = {},
    logger: WarningLogger = console,
  ) {
    this.provider = provider;
    this.limit = options.limit ?? 6;
    this.minimumScore = options.minimumScore ?? 0.2;
    this.logger = logger;
  }

  async retrieve(
    question: string,
    chunks: RagChunk[],
  ): Promise<RetrievalResult> {
    if (!chunks.length) return { chunks: [], strategy: "lexical" };

    try {
      const [documentEmbeddings, queryEmbedding] = await Promise.all([
        this.provider.embedDocuments(chunks.map((chunk) => chunk.text)),
        this.provider.embedQuery(question),
      ]);
      if (documentEmbeddings.length !== chunks.length) {
        throw new Error(
          "A API retornou uma quantidade inesperada de embeddings.",
        );
      }

      return {
        chunks: selectBest(
          chunks,
          documentEmbeddings.map((embedding) =>
            cosineSimilarity(queryEmbedding, embedding),
          ),
          this.limit,
          this.minimumScore,
        ),
        strategy: "vector",
      };
    } catch (error) {
      this.logger.warn("Vector retrieval unavailable; using lexical fallback", {
        reason: error instanceof Error ? error.message : "unknown",
      });
      return {
        chunks: selectBest(
          chunks,
          chunks.map((chunk) => lexicalSimilarity(question, chunk.text)),
          this.limit,
          0.01,
        ),
        strategy: "lexical",
      };
    }
  }
}
