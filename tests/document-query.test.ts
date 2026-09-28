import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocumentParts,
  createRateLimiter,
  mapTrustedSources,
  parseGeminiResult,
  validateQueryInput,
} from "../lib/document-query.ts";

const document = { id: "manual", title: "Manual interno", type: "TXT" as const, content: "O prazo é de cinco dias." };

test("aceita uma pergunta e documentos dentro dos limites", () => {
  assert.deepEqual(validateQueryInput({ question: "  Qual é o prazo?  ", documents: [document] }), {
    ok: true,
    question: "Qual é o prazo?",
    documents: [document],
  });
});

test("rejeita perguntas e quantidades de documentos inválidas", () => {
  assert.equal(validateQueryInput({ question: "a", documents: [document] }).ok, false);
  assert.equal(validateQueryInput({ question: "Pergunta válida", documents: [] }).ok, false);
  assert.equal(validateQueryInput({ question: "Pergunta válida", documents: Array(9).fill(document) }).ok, false);
});

test("rejeita conteúdo acima do limite da demonstração", () => {
  const result = validateQueryInput({
    question: "Pergunta válida",
    documents: [{ ...document, content: "x".repeat(120_001) }],
  });
  assert.deepEqual(result, {
    ok: false,
    status: 413,
    error: "Os documentos selecionados são grandes demais para esta demonstração.",
  });
});

test("monta partes de texto e PDF sem misturar formatos", () => {
  const parts = buildDocumentParts([
    document,
    { id: "pdf", title: "Contrato", type: "PDF", dataBase64: "YWJj", mimeType: "application/pdf" },
  ]);
  assert.equal(parts.length, 3);
  assert.match(String(parts[0].text), /O prazo é de cinco dias/);
  assert.deepEqual(parts[2], { inlineData: { mimeType: "application/pdf", data: "YWJj" } });
});

test("interpreta JSON puro ou cercado por bloco Markdown", () => {
  const expected = { found: true, answer: "Cinco dias", sources: [] };
  assert.deepEqual(parseGeminiResult(JSON.stringify(expected)), expected);
  assert.deepEqual(parseGeminiResult(`\`\`\`json\n${JSON.stringify(expected)}\n\`\`\``), expected);
});

test("mantém somente fontes pertencentes aos documentos enviados", () => {
  const sources = mapTrustedSources({
    found: true,
    answer: "Cinco dias",
    sources: [
      { documentId: "manual", excerpt: " O prazo é de cinco dias. " },
      { documentId: "inventado", excerpt: "Fonte que não existe" },
    ],
  }, [document]);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].documentId, "manual");
  assert.equal(sources[0].excerpt, "O prazo é de cinco dias.");
});

test("limita requisições por chave e libera após a janela", () => {
  const limiter = createRateLimiter(2, 1000);
  assert.equal(limiter.isLimited("ip-1", 0), false);
  assert.equal(limiter.isLimited("ip-1", 100), false);
  assert.equal(limiter.isLimited("ip-1", 200), true);
  assert.equal(limiter.isLimited("ip-2", 200), false);
  assert.equal(limiter.isLimited("ip-1", 1200), false);
});
