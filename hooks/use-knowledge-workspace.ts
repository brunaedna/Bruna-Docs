"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { askKnowledgeBase } from "@/lib/knowledge/client";
import {
  INITIAL_DOCUMENTS,
  SUGGESTED_QUESTIONS,
  UPLOADED_DOCUMENT_QUESTIONS,
  WELCOME_MESSAGE,
} from "@/lib/knowledge/constants";
import { readKnowledgeDocument } from "@/lib/knowledge/file-reader";
import type { Message, ModelContextDocument } from "@/lib/knowledge/types";

function assistantMessage(content: string): Message {
  return { id: `assistant-${Date.now()}`, role: "assistant", content };
}

export function useKnowledgeWorkspace() {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  const activeDocuments = useMemo(
    () =>
      selectedDocument
        ? documents.filter((item) => item.id === selectedDocument)
        : documents,
    [documents, selectedDocument],
  );
  const activeSuggestions = selectedDocument?.startsWith("upload-")
    ? UPLOADED_DOCUMENT_QUESTIONS
    : SUGGESTED_QUESTIONS;
  const latestSources =
    [...messages].reverse().find((message) => message.sources?.length)
      ?.sources ?? [];

  const ask = useCallback(
    async (rawQuestion: string) => {
      const cleanQuestion = rawQuestion.trim();
      if (!cleanQuestion || isThinking) return null;

      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: "user", content: cleanQuestion },
      ]);
      setQuestion("");
      setIsThinking(true);

      try {
        const result = await askKnowledgeBase(cleanQuestion, activeDocuments);
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.answer,
            sources: result.sources,
          },
        ]);
        return result;
      } catch (error) {
        const content =
          error instanceof Error
            ? error.message
            : "Não foi possível consultar o Gemini agora.";
        setMessages((current) => [...current, assistantMessage(content)]);
        return { answer: content, sources: [] };
      } finally {
        setIsThinking(false);
      }
    },
    [activeDocuments, isThinking],
  );

  const addFile = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      const newDocument = await readKnowledgeDocument(file);
      setDocuments((current) => [newDocument, ...current]);
      setSelectedDocument(newDocument.id);
      setMessages((current) => [
        ...current,
        assistantMessage(
          `“${newDocument.title}” foi adicionado. Agora vou usar apenas esse arquivo nas próximas respostas.`,
        ),
      ]);
    } catch (error) {
      const content =
        error instanceof Error
          ? error.message
          : "Não foi possível ler esse arquivo.";
      setMessages((current) => [...current, assistantMessage(content)]);
    }
  }, []);

  useEffect(() => {
    const context = (document as ModelContextDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: "ask_knowledge_base",
      title: "Perguntar à base de conhecimento",
      description:
        "Faz uma pergunta sobre os documentos disponíveis e exibe a resposta com suas fontes.",
      inputSchema: {
        type: "object",
        properties: { question: { type: "string", minLength: 3 } },
        required: ["question"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute(input: unknown) {
        const value = input as { question?: unknown };
        if (
          typeof value.question !== "string" ||
          value.question.trim().length < 3
        ) {
          throw new Error("A pergunta precisa ter pelo menos 3 caracteres.");
        }
        const result = await ask(value.question);
        return (
          result ?? {
            answer: "A consulta já está em andamento.",
            sources: [],
          }
        );
      },
    };

    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => undefined);
    } catch (error) {
      console.warn(
        "Não foi possível registrar a ferramenta de documentos.",
        error,
      );
    }
    return () => lifecycle.abort();
  }, [ask]);

  return {
    documents,
    selectedDocument,
    setSelectedDocument,
    question,
    setQuestion,
    isThinking,
    showSources,
    setShowSources,
    showAbout,
    setShowAbout,
    messages,
    activeSuggestions,
    latestSources,
    ask,
    addFile,
  };
}
