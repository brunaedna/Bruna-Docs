import { MAX_UPLOAD_BYTES } from "./constants";
import type { KnowledgeDocument } from "./types";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function identifyFile(file: File) {
  const filename = file.name.toLowerCase();
  return {
    isPdf: file.type === "application/pdf" || filename.endsWith(".pdf"),
    isDocx:
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.endsWith(".docx"),
  };
}

export async function readKnowledgeDocument(
  file: File,
): Promise<KnowledgeDocument> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "Esse arquivo é maior que 6 MB. Para esta demonstração, escolha um documento menor.",
    );
  }

  const { isPdf, isDocx } = identifyFile(file);
  let content = "";

  if (isDocx) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    content = result.value.trim();
    if (!content) {
      throw new Error("Não encontrei texto legível nesse arquivo Word.");
    }
  } else if (!isPdf) {
    content = await file.text();
  }

  return {
    id: `upload-${Date.now()}`,
    title: file.name.replace(/\.(txt|md|pdf|docx)$/i, ""),
    type: isPdf ? "PDF" : isDocx ? "DOCX" : "TXT",
    pages: isPdf ? 1 : Math.max(1, Math.ceil(content.length / 2200)),
    updated: "Agora",
    content,
    dataBase64: isPdf ? await fileToBase64(file) : undefined,
    mimeType: isPdf ? "application/pdf" : file.type,
    accent: "#F08AC5",
  };
}
