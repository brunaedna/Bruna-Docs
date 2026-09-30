import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocumentParts,
  buildRetrievedParts,
  createRateLimiter,
  mapTrustedSources,
  parseGeminiResult,
  validateQueryInput,
} from "../lib/document-query.ts";

const document = {
  id: "manual",
  title: "Manual interno",
  type: "TXT" as const,
  content: "O prazo é de cinco dias.",
};

test("aceita uma pergunta e documentos dentro dos limites", () => {
  assert.deepEqual(
    validateQueryInput({
      question: "  Qual é o prazo?  ",
      documents: [document],
    }),
    {
      ok: true,
      question: "Qual é o prazo?",
      documents: [document],
    },
  );
});

test("rejeita perguntas e quantidades de documentos inválidas", () => {
  assert.equal(
    validateQueryInput({ question: "a", documents: [document] }).ok,
    false,
  );
  assert.equal(
    validateQueryInput({ question: "Pergunta válida", documents: [] }).ok,
    false,
  );
  assert.equal(
    validateQueryInput({
      question: "Pergunta válida",
      documents: Array(9).fill(document),
    }).ok,
    false,
  );
});

test("rejeita conteúdo acima do limite da demonstração", () => {
  const result = validateQueryInput({
    question: "Pergunta válida",
    documents: [{ ...document, content: "x".repeat(120_001) }],
  });
  assert.deepEqual(result, {
    ok: false,
    status: 413,
    error:
      "Os documentos selecionados são grandes demais para esta demonstração.",
  });
});

test("monta partes de texto e PDF sem misturar formatos", () => {
  const parts = buildDocumentParts([
    document,
    {
      id: "pdf",
      title: "Contrato",
      type: "PDF",
      dataBase64: "YWJj",
      mimeType: "application/pdf",
    },
  ]);
  assert.equal(parts.length, 3);
  assert.match(String(parts[0].text), /O prazo é de cinco dias/);
  assert.deepEqual(parts[2], {
    inlineData: { mimeType: "application/pdf", data: "YWJj" },
  });
});

test("monta o contexto somente com os trechos recuperados", () => {
  const parts = buildRetrievedParts(
    [
      {
        id: "manual-chunk-2",
        documentId: "manual",
        title: "Manual interno",
        text: "O prazo é de cinco dias.",
        location: "Trecho 2",
        index: 1,
        score: 0.91,
      },
    ],
    [document],
  );

  assert.equal(parts.length, 1);
  assert.match(String(parts[0].text), /manual-chunk-2/);
  assert.match(String(parts[0].text), /O prazo é de cinco dias/);
});

test("interpreta JSON puro ou cercado por bloco Markdown", () => {
  const expected = { found: true, answer: "Cinco dias", sources: [] };
  assert.deepEqual(parseGeminiResult(JSON.stringify(expected)), expected);
  assert.deepEqual(
    parseGeminiResult(`\`\`\`json\n${JSON.stringify(expected)}\n\`\`\``),
    expected,
  );
});

test("mantém somente fontes pertencentes aos documentos enviados", () => {
  const sources = mapTrustedSources(
    {
      found: true,
      answer: "Cinco dias",
      sources: [
        { documentId: "manual", excerpt: " O prazo é de cinco dias. " },
        { documentId: "inventado", excerpt: "Fonte que não existe" },
      ],
    },
    [document],
  );
  assert.equal(sources.length, 1);
  assert.equal(sources[0].documentId, "manual");
  assert.equal(sources[0].excerpt, "O prazo é de cinco dias.");
});

test("vincula uma fonte ao trecho recuperado e preserva sua pontuação", () => {
  const chunks = [
    {
      id: "manual-chunk-1",
      documentId: "manual",
      title: "Manual interno",
      text: "O prazo é de cinco dias.",
      location: "Trecho 1",
      index: 0,
      score: 0.87654,
    },
  ];
  const sources = mapTrustedSources(
    {
      found: true,
      answer: "Cinco dias",
      sources: [
        {
          chunkId: "manual-chunk-1",
          documentId: "manual",
          excerpt: "O prazo é de cinco dias.",
        },
      ],
    },
    [document],
    chunks,
  );

  assert.deepEqual(sources[0], {
    documentId: "manual",
    title: "Manual interno",
    excerpt: "O prazo é de cinco dias.",
    location: "Trecho 1",
    score: 0.8765,
  });
});

test("limita requisições por chave e libera após a janela", () => {
  const limiter = createRateLimiter(2, 1000);
  assert.equal(limiter.isLimited("ip-1", 0), false);
  assert.equal(limiter.isLimited("ip-1", 100), false);
  assert.equal(limiter.isLimited("ip-1", 200), true);
  assert.equal(limiter.isLimited("ip-2", 200), false);
  assert.equal(limiter.isLimited("ip-1", 1200), false);
});
