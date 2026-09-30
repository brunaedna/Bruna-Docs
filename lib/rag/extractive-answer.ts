import { lexicalSimilarity } from "./similarity.ts";
import type { RetrievedChunk } from "./types.ts";

export type ExtractiveAnswer = {
  answer: string;
  chunkId: string;
  documentId: string;
  excerpt: string;
  score: number;
};

type ExtractiveOptions = {
  minimumScore?: number;
  maximumLength?: number;
};

export function findExtractiveAnswer(
  question: string,
  chunks: RetrievedChunk[],
  options: ExtractiveOptions = {},
): ExtractiveAnswer | null {
  const minimumScore = options.minimumScore ?? 0.45;
  const maximumLength = options.maximumLength ?? 420;
  let best: ExtractiveAnswer | null = null;

  for (const chunk of chunks) {
    for (const sentence of splitSentences(chunk.text)) {
      const score = lexicalSimilarity(question, sentence);
      if (sentence.length > maximumLength || score < minimumScore) continue;
      if (!best || score > best.score) {
        best = {
          answer: sentence,
          chunkId: chunk.id,
          documentId: chunk.documentId,
          excerpt: sentence,
          score,
        };
      }
    }
  }

  return best;
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12);
}
