export type KnowledgeDocument = {
  id: string;
  title: string;
  type: "PDF" | "DOCX" | "TXT";
  pages: number;
  updated: string;
  content: string;
  accent: string;
  dataBase64?: string;
  mimeType?: string;
};

export type Source = {
  documentId: string;
  title: string;
  excerpt: string;
  context?: string;
  location: string;
  score: number;
};

export type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  sources?: Source[];
};

export type AskResult = {
  answer: string;
  sources: Source[];
};

export type ModelTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

export type ModelContextDocument = Document & {
  modelContext?: {
    registerTool: (
      tool: ModelTool,
      options?: { signal?: AbortSignal },
    ) => void | Promise<void>;
  };
};
