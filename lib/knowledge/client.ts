import type { AskResult, KnowledgeDocument, Source } from "./types";

type AskResponse = {
  answer?: string;
  sources?: Source[];
  error?: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "complete"; answer: string; sources?: Source[] }
  | { type: "error"; error: string };

function toRequestDocument(document: KnowledgeDocument) {
  const { id, title, type, content, dataBase64, mimeType } = document;
  return { id, title, type, content, dataBase64, mimeType };
}

export async function askKnowledgeBase(
  question: string,
  documents: KnowledgeDocument[],
  onDelta: (text: string) => void = () => undefined,
): Promise<AskResult> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      documents: documents.map(toRequestDocument),
    }),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as AskResponse;
    throw new Error(result.error || "Não foi possível obter uma resposta.");
  }

  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const result = (await response.json().catch(() => ({}))) as AskResponse;
    if (!result.answer) throw new Error("Não foi possível obter uma resposta.");
    onDelta(result.answer);
    return { answer: result.answer, sources: result.sources ?? [] };
  }

  if (!response.body) throw new Error("A resposta não pôde ser transmitida.");
  return consumeEventStream(response.body, onDelta);
}

async function consumeEventStream(
  stream: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed: AskResult | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = parseEvent(line);
      if (!event) continue;
      if (event.type === "delta") onDelta(event.text);
      if (event.type === "error") throw new Error(event.error);
      if (event.type === "complete") {
        completed = { answer: event.answer, sources: event.sources ?? [] };
      }
    }
    if (done) break;
  }

  const finalEvent = parseEvent(buffer);
  if (finalEvent?.type === "delta") onDelta(finalEvent.text);
  if (finalEvent?.type === "error") throw new Error(finalEvent.error);
  if (finalEvent?.type === "complete") {
    completed = {
      answer: finalEvent.answer,
      sources: finalEvent.sources ?? [],
    };
  }
  if (!completed?.answer)
    throw new Error("A resposta foi interrompida antes de terminar.");
  return completed;
}

function parseEvent(line: string): StreamEvent | null {
  if (!line.trim()) return null;
  return JSON.parse(line) as StreamEvent;
}
