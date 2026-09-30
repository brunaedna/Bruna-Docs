import assert from "node:assert/strict";
import test from "node:test";
import {
  FixedSizeDocumentChunker,
  splitText,
} from "../lib/rag/document-chunker.ts";
import { HybridRetriever } from "../lib/rag/retriever.ts";
import { cosineSimilarity, lexicalSimilarity } from "../lib/rag/similarity.ts";
import type { EmbeddingProvider, RagChunk } from "../lib/rag/types.ts";

test("divide texto em trechos com sobreposição e limites previsíveis", () => {
  const text = `${"Primeiro parágrafo com contexto. ".repeat(8)}\n\n${"Segundo parágrafo com detalhes. ".repeat(
    8,
  )}`;
  const chunks = splitText(text, 240, 40);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 240));
  assert.match(chunks.join(" "), /Primeiro parágrafo/);
  assert.match(chunks.join(" "), /Segundo parágrafo/);
});

test("gera identificadores e localizações estáveis para cada trecho", () => {
  const chunker = new FixedSizeDocumentChunker({
    chunkSize: 220,
    overlap: 20,
    maxChunks: 4,
  });
  const chunks = chunker.chunk([
    {
      id: "guia",
      title: "Guia",
      type: "TXT",
      content: "Conteúdo relevante. ".repeat(50),
    },
  ]);

  assert.equal(chunks.length, 4);
  assert.equal(chunks[0].id, "guia-chunk-1");
  assert.equal(chunks[0].location, "Trecho 1");
});

test("calcula similaridade vetorial e lexical sem depender de infraestrutura", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(
    lexicalSimilarity("prazo reembolso", "O prazo do reembolso é curto"),
    1,
  );
});

test("recupera os trechos semanticamente mais próximos", async () => {
  const chunks: RagChunk[] = [
    {
      id: "a",
      documentId: "doc",
      title: "Documento",
      text: "Política de férias",
      location: "Trecho 1",
      index: 0,
    },
    {
      id: "b",
      documentId: "doc",
      title: "Documento",
      text: "Reembolso de internet",
      location: "Trecho 2",
      index: 1,
    },
  ];
  const provider: EmbeddingProvider = {
    async embedDocuments() {
      return [
        [0, 1],
        [1, 0],
      ];
    },
    async embedQuery() {
      return [1, 0];
    },
  };
  const retriever = new HybridRetriever(provider, {
    limit: 1,
    lexicalFastPathScore: 1.1,
  });

  const result = await retriever.retrieve("Qual é o reembolso?", chunks);

  assert.equal(result.strategy, "vector");
  assert.equal(result.chunks[0].id, "b");
});

test("evita chamada de embeddings quando a correspondência textual é forte", async () => {
  let providerCalls = 0;
  const provider: EmbeddingProvider = {
    async embedDocuments() {
      providerCalls += 1;
      return [[1, 0]];
    },
    async embedQuery() {
      providerCalls += 1;
      return [1, 0];
    },
  };
  const chunks: RagChunk[] = [
    {
      id: "onboarding",
      documentId: "manual",
      title: "Manual",
      text: "O onboarding dura duas semanas.",
      location: "Trecho 1",
      index: 0,
    },
  ];

  const result = await new HybridRetriever(provider).retrieve(
    "Quanto tempo dura o onboarding?",
    chunks,
  );

  assert.equal(result.strategy, "lexical-fast");
  assert.equal(result.chunks[0].id, "onboarding");
  assert.equal(providerCalls, 0);
});

test("mantém a consulta disponível com busca lexical se embeddings falharem", async () => {
  const chunks: RagChunk[] = [
    {
      id: "prazo",
      documentId: "doc",
      title: "Documento",
      text: "O prazo para resposta é de cinco dias.",
      location: "Trecho 1",
      index: 0,
    },
    {
      id: "valor",
      documentId: "doc",
      title: "Documento",
      text: "O valor mensal é cinquenta reais.",
      location: "Trecho 2",
      index: 1,
    },
  ];
  const unavailableProvider: EmbeddingProvider = {
    async embedDocuments() {
      throw new Error("indisponível");
    },
    async embedQuery() {
      throw new Error("indisponível");
    },
  };
  const retriever = new HybridRetriever(
    unavailableProvider,
    { limit: 1, lexicalFastPathScore: 1.1 },
    { warn() {} },
  );

  const result = await retriever.retrieve("Qual é o prazo?", chunks);

  assert.equal(result.strategy, "lexical");
  assert.equal(result.chunks[0].id, "prazo");
});
