import type { AskResult, KnowledgeDocument, Source } from "./types";

type AskResponse = {
  answer?: string;
  sources?: Source[];
  error?: string;
};

function toRequestDocument(document: KnowledgeDocument) {
  const { id, title, type, content, dataBase64, mimeType } = document;
  return { id, title, type, content, dataBase64, mimeType };
}

export async function askKnowledgeBase(
  question: string,
  documents: KnowledgeDocument[],
): Promise<AskResult> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      documents: documents.map(toRequestDocument),
    }),
  });
  const result = (await response.json().catch(() => ({}))) as AskResponse;

  if (!response.ok || !result.answer) {
    throw new Error(result.error || "Não foi possível obter uma resposta.");
  }

  return { answer: result.answer, sources: result.sources ?? [] };
}
