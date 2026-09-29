import { env } from "cloudflare:workers";
import {
  buildDocumentParts,
  createRateLimiter,
  mapTrustedSources,
  parseGeminiResult,
  validateQueryInput,
} from "../../../lib/document-query";
import { isDistributedRateLimited } from "../../../lib/request-rate-limit";
import { queryGeminiDocuments } from "../../../lib/gemini-document-client";

const rateLimiter = createRateLimiter();

async function isRateLimited(request: Request) {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (env.DB) {
    try {
      return await isDistributedRateLimited(env.DB, key);
    } catch (error) {
      console.error(
        "D1 rate limit unavailable; using local development fallback",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return rateLimiter.isLimited(key);
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (await isRateLimited(request)) {
    return json(
      {
        error:
          "Muitas perguntas em pouco tempo. Aguarde alguns minutos e tente novamente.",
      },
      429,
    );
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey)
    return json(
      { error: "A conexão com o Gemini ainda não está configurada." },
      503,
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Não foi possível ler a pergunta." }, 400);
  }

  const validation = validateQueryInput(body);
  if (!validation.ok)
    return json({ error: validation.error }, validation.status);
  const { question, documents } = validation;
  const documentParts = buildDocumentParts(documents);
  if (!documentParts.length)
    return json(
      { error: "Nenhum conteúdo legível foi encontrado nos documentos." },
      400,
    );

  const gemini = await queryGeminiDocuments(apiKey, question, documentParts);
  if (!gemini.ok) return json({ error: gemini.error }, gemini.status);

  try {
    const result = parseGeminiResult(gemini.output);
    if (!result.found || !result.answer) {
      return json({
        answer: "Não encontrei essa informação nos documentos selecionados.",
        sources: [],
      });
    }

    const sources = mapTrustedSources(result, documents);
    return json({ answer: result.answer, sources });
  } catch {
    return json(
      {
        error:
          "O Gemini respondeu em um formato inesperado. Tente reformular a pergunta.",
      },
      502,
    );
  }
}
