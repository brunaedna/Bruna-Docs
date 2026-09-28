export type RequestDocument = {
  id: string;
  title: string;
  type: "PDF" | "DOCX" | "TXT";
  content?: string;
  dataBase64?: string;
  mimeType?: string;
};

export type GeminiResult = {
  found?: boolean;
  answer?: string;
  sources?: Array<{ documentId?: string; excerpt?: string }>;
};

type ValidationResult =
  | { ok: true; question: string; documents: RequestDocument[] }
  | { ok: false; status: number; error: string };

export function validateQueryInput(body: unknown): ValidationResult {
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const documents = Array.isArray(payload.documents)
    ? payload.documents.filter((item): item is RequestDocument => Boolean(item && typeof item === "object"))
    : [];

  if (question.length < 3 || question.length > 1000) {
    return { ok: false, status: 400, error: "Escreva uma pergunta entre 3 e 1.000 caracteres." };
  }
  if (!documents.length || documents.length > 8) {
    return { ok: false, status: 400, error: "Selecione entre 1 e 8 documentos para consultar." };
  }

  const textSize = documents.reduce((total, item) => total + (item.content?.length ?? 0), 0);
  const binarySize = documents.reduce((total, item) => total + (item.dataBase64?.length ?? 0), 0);
  if (textSize > 120_000 || binarySize > 9_000_000) {
    return { ok: false, status: 413, error: "Os documentos selecionados são grandes demais para esta demonstração." };
  }
  return { ok: true, question, documents };
}

export function buildDocumentParts(documents: RequestDocument[]) {
  const parts: Array<Record<string, unknown>> = [];
  for (const item of documents) {
    if (!item.id || !item.title) continue;
    if (item.dataBase64 && item.mimeType === "application/pdf") {
      parts.push({ text: `\n--- DOCUMENTO ${item.id}: ${item.title} ---\n` });
      parts.push({ inlineData: { mimeType: item.mimeType, data: item.dataBase64 } });
    } else if (item.content) {
      parts.push({ text: `\n--- DOCUMENTO ${item.id}: ${item.title} ---\n${item.content}\n--- FIM DO DOCUMENTO ${item.id} ---\n` });
    }
  }
  return parts;
}

export function parseGeminiResult(text: string): GeminiResult {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as GeminiResult;
}

export function mapTrustedSources(result: GeminiResult, documents: RequestDocument[]) {
  return (result.sources ?? []).slice(0, 3).flatMap((source) => {
    const document = documents.find((item) => item.id === source.documentId);
    if (!document || !source.excerpt?.trim()) return [];
    return [{
      documentId: document.id,
      title: document.title,
      excerpt: source.excerpt.trim().slice(0, 420),
      location: `${document.type} · trecho identificado pelo Gemini`,
      score: 1,
    }];
  });
}

export function createRateLimiter(maxRequests = 12, windowMs = 10 * 60 * 1000) {
  const requestWindows = new Map<string, number[]>();
  return {
    isLimited(key: string, now = Date.now()) {
      const recent = (requestWindows.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
      if (recent.length >= maxRequests) return true;
      recent.push(now);
      requestWindows.set(key, recent);
      return false;
    },
  };
}
