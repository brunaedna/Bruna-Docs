import { env } from "cloudflare:workers";
import {
  buildRetrievedParts,
  createRateLimiter,
  mapTrustedSources,
  validateQueryInput,
} from "../../../lib/document-query";
import { GeminiEmbeddingClient } from "../../../lib/gemini-embedding-client";
import { isDistributedRateLimited } from "../../../lib/request-rate-limit";
import {
  readGeminiTextStream,
  streamGeminiDocuments,
} from "../../../lib/gemini-document-client";
import { FixedSizeDocumentChunker } from "../../../lib/rag/document-chunker";
import { findExtractiveAnswer } from "../../../lib/rag/extractive-answer";
import { HybridRetriever } from "../../../lib/rag/retriever";

const rateLimiter = createRateLimiter();
const documentChunker = new FixedSizeDocumentChunker();

async function isRateLimited(request: Request) {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (env.DB) {
    try {
      return await isDistributedRateLimited(env.DB, key);
    } catch (error) {
      console.error(
        "D1 rate limit unavailable; using local development fallback",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return rateLimiter.isLimited(key);
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function streamResponse(
  answer: string,
  sources: unknown[],
  retrieval: Record<string, unknown>,
) {
  return eventStream(async (send) => {
    send({ type: "delta", text: answer });
    send({ type: "complete", answer, sources, retrieval });
  });
}

function eventStream(
  producer: (send: (event: Record<string, unknown>) => void) => Promise<void>,
) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await producer(send);
      } catch (error) {
        send({
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "A resposta foi interrompida inesperadamente.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  if (await isRateLimited(request)) {
    return json(
      {
        error:
          "Muitas perguntas em pouco tempo. Aguarde alguns minutos e tente novamente.",
      },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Não foi possível ler a pergunta." }, 400);
  }

  const validation = validateQueryInput(body);
  if (!validation.ok)
    return json({ error: validation.error }, validation.status);
  const { question, documents } = validation;
  const chunks = documentChunker.chunk(documents);
  const apiKey = env.GEMINI_API_KEY ?? "";
  const retriever = new HybridRetriever(new GeminiEmbeddingClient(apiKey));
  const retrieval = await retriever.retrieve(question, chunks);
  const extractiveAnswer =
    retrieval.strategy === "lexical-fast"
      ? findExtractiveAnswer(question, retrieval.chunks)
      : null;

  if (extractiveAnswer) {
    const sources = mapTrustedSources(
      {
        found: true,
        answer: extractiveAnswer.answer,
        sources: [extractiveAnswer],
      },
      documents,
      retrieval.chunks,
    );
    return streamResponse(extractiveAnswer.answer, sources, {
      strategy: retrieval.strategy,
      answerMode: "extractive",
      chunksConsidered: chunks.length,
      chunksSelected: retrieval.chunks.length,
    });
  }

  if (!apiKey)
    return json(
      { error: "A conexão com o Gemini ainda não está configurada." },
      503,
    );

  const documentParts = buildRetrievedParts(retrieval.chunks, documents);
  if (!documentParts.length)
    return json(
      { error: "Nenhum conteúdo legível foi encontrado nos documentos." },
      400,
    );

  const gemini = await streamGeminiDocuments(apiKey, question, documentParts);
  if (!gemini.ok) return json({ error: gemini.error }, gemini.status);

  const sources = sourcesFromRetrieval(question, retrieval.chunks, documents);
  return eventStream(async (send) => {
    let answer = "";
    for await (const text of readGeminiTextStream(gemini.body)) {
      answer += text;
      send({ type: "delta", text });
    }
    if (!answer.trim())
      throw new Error("O Gemini não retornou uma resposta utilizável.");
    send({
      type: "complete",
      answer: answer.trim(),
      sources,
      retrieval: {
        strategy: retrieval.strategy,
        answerMode: "generative-stream",
        chunksConsidered: chunks.length,
        chunksSelected: retrieval.chunks.length,
      },
    });
  });
}

function sourcesFromRetrieval(
  question: string,
  chunks: Awaited<ReturnType<HybridRetriever["retrieve"]>>["chunks"],
  documents: Array<{
    id: string;
    title: string;
    type: "PDF" | "DOCX" | "TXT";
    content?: string;
  }>,
) {
  const result = {
    found: true,
    answer: "",
    sources: chunks.slice(0, 3).map((chunk) => {
      const match = findExtractiveAnswer(question, [chunk], {
        minimumScore: 0,
      });
      return {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        excerpt: match?.excerpt ?? chunk.text.slice(0, 420),
      };
    }),
  };
  const mapped = mapTrustedSources(result, documents, chunks);
  if (mapped.length) return mapped;

  return documents
    .filter((document) => document.type === "PDF" && !document.content?.trim())
    .slice(0, 3)
    .map((document) => ({
      documentId: document.id,
      title: document.title,
      excerpt: "Conteúdo analisado diretamente no documento PDF.",
      location: "Documento PDF",
      score: 1,
    }));
}
