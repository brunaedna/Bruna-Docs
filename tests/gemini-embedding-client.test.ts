import assert from "node:assert/strict";
import test from "node:test";
import { GeminiEmbeddingClient } from "../lib/gemini-embedding-client.ts";

test("solicita embeddings distintos para documentos e consultas", async () => {
  const payloads: Array<Record<string, unknown>> = [];
  const fetcher = (async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    payloads.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    const requests = payloads.at(-1)?.requests as unknown[];
    return Response.json({
      embeddings: requests.map((_, index) => ({ values: [index + 1, 0] })),
    });
  }) as typeof fetch;
  const client = new GeminiEmbeddingClient("test-key", fetcher);

  const documents = await client.embedDocuments(["um", "dois"]);
  const query = await client.embedQuery("pergunta");

  assert.deepEqual(documents, [
    [1, 0],
    [2, 0],
  ]);
  assert.deepEqual(query, [1, 0]);
  assert.equal(
    (payloads[0].requests as Array<{ taskType: string }>)[0].taskType,
    "RETRIEVAL_DOCUMENT",
  );
  assert.equal(
    (payloads[1].requests as Array<{ taskType: string }>)[0].taskType,
    "RETRIEVAL_QUERY",
  );
});

test("rejeita respostas sem vetores utilizáveis", async () => {
  const fetcher = (async () =>
    Response.json({ embeddings: [{ values: [] }] })) as typeof fetch;
  const client = new GeminiEmbeddingClient("test-key", fetcher);

  await assert.rejects(() => client.embedQuery("pergunta"), /embedding vazio/i);
});
