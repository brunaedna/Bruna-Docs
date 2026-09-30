import assert from "node:assert/strict";
import test from "node:test";

import { findExtractiveAnswer } from "../lib/rag/extractive-answer.ts";

const chunk = {
  id: "onboarding-chunk-1",
  documentId: "onboarding",
  title: "Manual de onboarding",
  text: "O onboarding dura duas semanas. No primeiro dia, a pessoa recebe os acessos essenciais.",
  location: "Trecho 1",
  index: 0,
  score: 0.75,
};

test("responde imediatamente quando uma frase corresponde diretamente à pergunta", () => {
  const result = findExtractiveAnswer("Quanto tempo dura o onboarding?", [
    chunk,
  ]);

  assert.deepEqual(result, {
    answer: "O onboarding dura duas semanas.",
    chunkId: "onboarding-chunk-1",
    documentId: "onboarding",
    excerpt: "O onboarding dura duas semanas.",
    score: 0.5,
  });
});

test("mantém o Gemini no fluxo quando não há correspondência factual suficiente", () => {
  const result = findExtractiveAnswer(
    "Explique como melhorar toda a experiência de integração.",
    [chunk],
  );

  assert.equal(result, null);
});
