import assert from "node:assert/strict";
import test from "node:test";
import {
  createDocumentPrompt,
  queryGeminiDocuments,
} from "../lib/gemini-document-client.ts";

test("monta uma instrução documental sem misturar a pergunta às regras", () => {
  const prompt = createDocumentPrompt("Qual é o prazo?");
  assert.match(prompt, /somente os trechos ou PDFs fornecidos/);
  assert.match(prompt, /PERGUNTA: Qual é o prazo\?/);
  assert.match(prompt, /documentId/);
});

test("usa o modelo alternativo quando o primeiro está indisponível", async () => {
  const requestedUrls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    requestedUrls.push(String(input));
    if (requestedUrls.length === 1) {
      return Response.json(
        { error: { code: 404, status: "NOT_FOUND" } },
        { status: 404 },
      );
    }
    return Response.json({
      candidates: [{ content: { parts: [{ text: '{"found":true}' }] } }],
    });
  }) as typeof fetch;

  const result = await queryGeminiDocuments(
    "test-key",
    "Qual é o prazo?",
    [{ text: "Documento" }],
    fetcher,
    { error() {} },
  );

  assert.equal(requestedUrls.length, 2);
  assert.deepEqual(result, { ok: true, output: '{"found":true}' });
});

test("transforma resposta de cota em erro apropriado para a rota", async () => {
  const fetcher = (async () =>
    Response.json(
      { error: { code: 429, status: "RESOURCE_EXHAUSTED" } },
      { status: 429 },
    )) as typeof fetch;

  const result = await queryGeminiDocuments(
    "test-key",
    "Qual é o prazo?",
    [{ text: "Documento" }],
    fetcher,
    { error() {} },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 429);
    assert.match(result.error, /cota gratuita/i);
  }
});
