import type { ChunkableDocument, DocumentChunker, RagChunk } from "./types";

const DEFAULT_CHUNK_SIZE = 1_600;
const DEFAULT_OVERLAP = 240;
const DEFAULT_MAX_CHUNKS = 96;

type ChunkerOptions = {
  chunkSize?: number;
  overlap?: number;
  maxChunks?: number;
};

function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findNaturalBoundary(text: string, start: number, desiredEnd: number) {
  if (desiredEnd >= text.length) return text.length;

  const minimumEnd = start + Math.floor((desiredEnd - start) * 0.65);
  const candidate = text.slice(minimumEnd, desiredEnd);
  const separators = ["\n\n", ". ", "\n", " "];

  for (const separator of separators) {
    const position = candidate.lastIndexOf(separator);
    if (position >= 0) {
      return minimumEnd + position + separator.length;
    }
  }
  return desiredEnd;
}

export function splitText(
  value: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
) {
  const text = normalizeText(value);
  if (!text) return [];
  if (chunkSize < 200) throw new Error("O tamanho do trecho é muito pequeno.");
  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error("A sobreposição deve ser menor que o tamanho do trecho.");
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const desiredEnd = Math.min(start + chunkSize, text.length);
    const end = findNaturalBoundary(text, start, desiredEnd);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}

export class FixedSizeDocumentChunker implements DocumentChunker {
  private readonly chunkSize: number;
  private readonly overlap: number;
  private readonly maxChunks: number;

  constructor(options: ChunkerOptions = {}) {
    this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    this.overlap = options.overlap ?? DEFAULT_OVERLAP;
    this.maxChunks = options.maxChunks ?? DEFAULT_MAX_CHUNKS;
  }

  chunk(documents: ChunkableDocument[]): RagChunk[] {
    const textDocuments = documents.filter((document) =>
      document.content?.trim(),
    );
    if (!textDocuments.length) return [];

    const perDocumentLimit = Math.max(
      1,
      Math.floor(this.maxChunks / textDocuments.length),
    );

    return textDocuments
      .flatMap((document) =>
        splitText(document.content ?? "", this.chunkSize, this.overlap)
          .slice(0, perDocumentLimit)
          .map((text, index) => ({
            id: `${document.id}-chunk-${index + 1}`,
            documentId: document.id,
            title: document.title,
            text,
            location: `Trecho ${index + 1}`,
            index,
          })),
      )
      .slice(0, this.maxChunks);
  }
}
