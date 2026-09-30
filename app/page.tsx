"use client";

import type { FormEvent } from "react";
import {
  ArrowUp,
  BookOpenText,
  BriefcaseBusiness,
  PanelRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AboutDialog } from "@/components/knowledge/about-dialog";
import { LibrarySidebar } from "@/components/knowledge/library-sidebar";
import { SourcesSidebar } from "@/components/knowledge/sources-sidebar";
import { useKnowledgeWorkspace } from "@/hooks/use-knowledge-workspace";

export default function Home() {
  const {
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
  } = useKnowledgeWorkspace();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <main className="ambient-shell min-h-screen bg-[var(--app-bg)] text-[var(--ink)]">
      <header className="brand-header sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/15 px-4 text-white backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3">
          <div className="brand-mark grid size-9 place-items-center rounded-xl text-[#5741c7]">
            <Sparkles className="size-[18px]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.02em]">
              Bruna Docs
            </p>
            <p className="text-[11px] text-white/45">
              assistente de documentos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 sm:inline-flex">
            Gemini · consulta semântica
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAbout(true)}
            className="hidden rounded-full border border-white/10 bg-white/5 text-xs text-white/75 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <BriefcaseBusiness className="size-3.5" />
            Sobre o projeto
          </Button>
          <button
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-sm font-semibold"
            aria-label="Perfil de Bruna"
          >
            BE
          </button>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-1 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:grid-cols-[285px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[285px_minmax(0,1fr)_330px]">
        <LibrarySidebar
          documents={documents}
          selectedDocument={selectedDocument}
          onSelect={setSelectedDocument}
          onFile={(file) => void addFile(file)}
        />

        <section className="flex min-h-[760px] min-w-0 flex-col overflow-hidden bg-white lg:h-full lg:min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <BookOpenText className="size-4 text-[#6755de]" />
                <h1 className="truncate text-base font-semibold tracking-[-0.02em]">
                  Consulta à base de conhecimento
                </h1>
              </div>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">
                {selectedDocument
                  ? "Usando 1 documento selecionado"
                  : `Usando todos os ${documents.length} documentos`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl xl:hidden"
              onClick={() => setShowSources((value) => !value)}
              aria-label="Mostrar fontes"
            >
              <PanelRight className="size-4" />
            </Button>
          </div>

          <div className="border-b border-[#ddd9ff] bg-gradient-to-r from-[#f1efff] via-[#f5f4ff] to-[#edf8ff] px-5 py-3 sm:px-8">
            <div className="mx-auto flex max-w-3xl items-start gap-3 text-xs leading-relaxed text-[#575477]">
              <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-[#6755de]" />
              <p>
                <strong className="font-semibold text-[#3f3789]">
                  Demonstração de portfólio.
                </strong>{" "}
                Este projeto foi desenvolvido exclusivamente para apresentar
                habilidades em IA e desenvolvimento web. As consultas são
                limitadas pela cota gratuita do Gemini e podem ficar
                temporariamente indisponíveis quando o limite é atingido.
              </p>
            </div>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="gradient-action grid size-8 shrink-0 place-items-center rounded-xl text-white">
                      <Sparkles className="size-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] ${message.role === "user" ? "rounded-[20px_20px_6px_20px] bg-gradient-to-br from-[#7658f4] to-[#3476f7] px-4 py-3 text-white shadow-[0_10px_28px_rgba(91,72,220,.22)]" : "pt-1"}`}
                  >
                    <p
                      className={`text-[15px] leading-7 ${message.role === "assistant" ? "text-[#302f48]" : "text-white/95"}`}
                    >
                      {message.content}
                    </p>
                    {!!message.sources?.length && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.sources.map((source, index) => (
                          <button
                            key={`${message.id}-${source.documentId}`}
                            onClick={() =>
                              setSelectedDocument(source.documentId)
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-[#cbc6ff] bg-[#f5f3ff] px-3 py-1.5 text-xs font-medium text-[#5747c0] hover:bg-[#ece9ff]"
                          >
                            <span className="grid size-4 place-items-center rounded-full bg-[#ddd8ff] text-[10px]">
                              {index + 1}
                            </span>
                            {source.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {isThinking && !messages.at(-1)?.content && (
                <div className="flex items-center gap-3" aria-live="polite">
                  <div className="gradient-action grid size-8 place-items-center rounded-xl text-white">
                    <Sparkles className="size-4 animate-pulse" />
                  </div>
                  <div className="flex gap-1.5 rounded-full bg-[var(--panel)] px-4 py-3">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="size-1.5 animate-pulse rounded-full bg-[#7565e8]"
                        style={{ animationDelay: `${dot * 120}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {(messages.length === 1 ||
                selectedDocument?.startsWith("upload-")) && (
                <div className="pt-2">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    {selectedDocument?.startsWith("upload-")
                      ? "Perguntas para este arquivo"
                      : "Experimente perguntar"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {activeSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void ask(suggestion)}
                        disabled={isThinking}
                        className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left text-sm leading-5 transition hover:-translate-y-0.5 hover:border-[#aaa1ff] hover:bg-[#eeecff] hover:shadow-[0_10px_24px_rgba(94,75,220,.1)] disabled:pointer-events-none disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--line)] bg-white px-4 py-4 sm:px-8 sm:py-5">
            <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-[#cbc7ef] bg-white p-2 shadow-[0_14px_45px_rgba(79,65,170,.1)] transition focus-within:border-[#8f80ff] focus-within:ring-4 focus-within:ring-[#8878ff]/15">
                <Textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void ask(question);
                    }
                  }}
                  placeholder="Pergunte algo sobre seus documentos…"
                  className="min-h-[64px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] shadow-none focus-visible:ring-0"
                  aria-label="Pergunta para a base de conhecimento"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <span className="text-[11px] text-[var(--muted)]">
                    Enter para enviar · Shift + Enter para quebrar linha
                  </span>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!question.trim() || isThinking}
                    className="gradient-action size-9 rounded-xl text-white"
                    aria-label="Enviar pergunta"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
                O Gemini responde somente com base nos documentos selecionados.
                Os arquivos não são salvos pelo Bruna Docs; evite conteúdo
                confidencial nesta demonstração.
              </p>
            </form>
          </div>
        </section>

        <SourcesSidebar
          isVisible={showSources}
          sources={latestSources}
          onAbout={() => setShowAbout(true)}
        />
      </div>

      <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
    </main>
  );
}
