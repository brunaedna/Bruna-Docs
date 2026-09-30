import type { EmbeddingProvider } from "./rag/types";

type EmbeddingApiResponse = {
  embeddings?: Array<{ values?: number[] }>;
  error?: { code?: number; message?: string; status?: string };
};

type Fetcher = typeof fetch;

const MODEL = "gemini-embedding-001";
const MAX_BATCH_SIZE = 32;

function buildRequest(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
) {
  return {
    model: `models/${MODEL}`,
    taskType,
    content: { parts: [{ text }] },
  };
}

export class GeminiEmbeddingClient implements EmbeddingProvider {
  private readonly apiKey: string;
  private readonly fetcher: Fetcher;

  constructor(apiKey: string, fetcher: Fetcher = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  embedDocuments(texts: string[]) {
    return this.embed(texts, "RETRIEVAL_DOCUMENT");
  }

  async embedQuery(text: string) {
    const [embedding] = await this.embed([text], "RETRIEVAL_QUERY");
    if (!embedding) throw new Error("A consulta não produziu um embedding.");
    return embedding;
  }

  private async embed(
    texts: string[],
    taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  ) {
    const embeddings: number[][] = [];

    for (let start = 0; start < texts.length; start += MAX_BATCH_SIZE) {
      const batch = texts.slice(start, start + MAX_BATCH_SIZE);
      const response = await this.fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            requests: batch.map((text) => buildRequest(text, taskType)),
          }),
        },
      );
      const result = (await response
        .json()
        .catch(() => null)) as EmbeddingApiResponse | null;

      if (!response.ok || !result?.embeddings) {
        throw new Error(
          `Falha ao gerar embeddings (${response.status || "sem resposta"}).`,
        );
      }

      const values = result.embeddings.map(
        (embedding) => embedding.values ?? [],
      );
      if (values.some((embedding) => !embedding.length)) {
        throw new Error("A API retornou um embedding vazio.");
      }
      embeddings.push(...values);
    }

    return embeddings;
  }
}
