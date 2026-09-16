"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUp, BookOpenText, Check, ChevronDown, FileText, FolderOpen, PanelRight, Plus, Search, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type KnowledgeDocument = { id: string; title: string; type: "PDF" | "DOC" | "TXT"; pages: number; updated: string; content: string; accent: string };
type Source = { documentId: string; title: string; excerpt: string; location: string; score: number };
type Message = { id: string; role: "assistant" | "user"; content: string; sources?: Source[] };
type ModelTool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: unknown) => unknown | Promise<unknown> };
type ModelContextDocument = Document & { modelContext?: { registerTool: (tool: ModelTool, options?: { signal?: AbortSignal }) => void | Promise<void> } };

const initialDocuments: KnowledgeDocument[] = [
  {
    id: "onboarding", title: "Manual de onboarding", type: "PDF", pages: 18, updated: "Hoje, 09:42", accent: "#73E6C2",
    content: "O onboarding dura duas semanas. No primeiro dia, a pessoa recebe os acessos essenciais, conhece sua liderança e revisa o plano de 30 dias. Na primeira semana, participa de sessões com Produto, Engenharia e Suporte. O buddy acompanha dúvidas operacionais e realiza checkpoints nos dias 3, 7 e 14. Ao final da segunda semana, liderança e colaborador revisam entregas iniciais, bloqueios e próximos objetivos.",
  },
  {
    id: "remote", title: "Política de trabalho remoto", type: "DOC", pages: 9, updated: "Ontem, 16:18", accent: "#A9B8FF",
    content: "O trabalho remoto é permitido em todo o território nacional. Cada equipe define uma janela de colaboração de quatro horas entre 10h e 17h no horário de Brasília. Reuniões devem ter pauta, responsável e registro de decisões. Despesas de internet podem ser reembolsadas em até R$ 150 por mês mediante comprovante. Equipamentos corporativos devem usar autenticação multifator e bloqueio automático.",
  },
  {
    id: "product", title: "Guia de produto — Q3", type: "PDF", pages: 24, updated: "12 set, 11:30", accent: "#F4C86B",
    content: "As prioridades do terceiro trimestre são reduzir o tempo até o primeiro valor, melhorar a busca e aumentar a confiança nas respostas. O indicador principal é a taxa de respostas úteis. Metas: reduzir o onboarding de 12 para 7 minutos, alcançar 85% de avaliações positivas e exibir fontes em 100% das respostas. A equipe também acompanhará tempo de resposta e custo por consulta.",
  },
];

const suggestedQuestions = ["Quanto tempo dura o onboarding?", "Qual é o limite de reembolso da internet?", "Quais são as metas do terceiro trimestre?"];

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !["que", "com", "para", "uma", "das", "dos", "qual", "quais", "como"].includes(word));

function retrieve(question: string, documents: KnowledgeDocument[]) {
  const terms = normalize(question);
  const ranked = documents.map((knowledgeDocument) => {
    const sentences = knowledgeDocument.content.split(/(?<=[.!?])\s+/).filter(Boolean).map((excerpt, index) => {
      const excerptTerms = new Set(normalize(excerpt));
      const matches = terms.filter((term) => excerptTerms.has(term));
      return { excerpt, index, matches: matches.length };
    });
    const documentTerms = new Set(normalize(knowledgeDocument.content));
    const score = terms.filter((term) => documentTerms.has(term)).length / Math.max(terms.length, 1);
    const bestSentences = sentences.filter((item) => item.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 2).sort((a, b) => a.index - b.index);
    return { document: knowledgeDocument, score, bestSentences };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score === 0 || !best.bestSentences.length) return { answer: "Não encontrei uma resposta segura nos documentos disponíveis. Tente reformular a pergunta ou adicione um arquivo com esse assunto.", sources: [] };
  const sources: Source[] = ranked.filter((item) => item.score >= Math.max(0.34, best.score * 0.7) && item.bestSentences.length).slice(0, 2).map((item) => ({
    documentId: item.document.id,
    title: item.document.title,
    excerpt: item.bestSentences.map((sentence) => sentence.excerpt).join(" "),
    location: `${item.document.type} · ${item.bestSentences.length === 1 ? `trecho ${item.bestSentences[0].index + 1}` : "2 trechos relacionados"}`,
    score: item.score,
  }));
  const answerText = best.bestSentences.map((sentence) => sentence.excerpt).join(" ");
  const prefix = best.score >= 0.5 ? "Encontrei isto nos documentos:" : "O trecho mais relacionado que encontrei diz:";
  return { answer: `${prefix} ${answerText}`, sources };
}

export default function Home() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: "Olá, Bruna. Posso localizar informações nos documentos e mostrar exatamente de onde cada resposta veio. O que você quer descobrir?" }]);
  const activeDocuments = useMemo(() => selectedDocument ? documents.filter((item) => item.id === selectedDocument) : documents, [documents, selectedDocument]);
  const latestSources = [...messages].reverse().find((message) => message.sources?.length)?.sources ?? [];

  const ask = useCallback(async (rawQuestion: string) => {
    const cleanQuestion = rawQuestion.trim();
    if (!cleanQuestion || isThinking) return null;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: cleanQuestion }]);
    setQuestion("");
    setIsThinking(true);
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    const result = retrieve(cleanQuestion, activeDocuments);
    setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: result.answer, sources: result.sources }]);
    setIsThinking(false);
    return result;
  }, [activeDocuments, isThinking]);

  useEffect(() => {
    const context = (document as ModelContextDocument).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: "ask_knowledge_base",
        title: "Perguntar à base de conhecimento",
        description: "Faz uma pergunta sobre os documentos disponíveis e exibe a resposta com suas fontes.",
        inputSchema: { type: "object", properties: { question: { type: "string", minLength: 3 } }, required: ["question"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        async execute(input) {
          const value = input as { question?: unknown };
          if (typeof value.question !== "string" || value.question.trim().length < 3) throw new Error("A pergunta precisa ter pelo menos 3 caracteres.");
          const result = await ask(value.question);
          return result ?? { answer: "A consulta já está em andamento.", sources: [] };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch {}
    return () => lifecycle.abort();
  }, [ask]);

  const onSubmit = (event: FormEvent) => { event.preventDefault(); void ask(question) };
  const onFile = async (file?: File) => {
    if (!file) return;
    const content = await file.text();
    const newDocument: KnowledgeDocument = { id: `upload-${Date.now()}`, title: file.name.replace(/\.(txt|md)$/i, ""), type: "TXT", pages: Math.max(1, Math.ceil(content.length / 2200)), updated: "Agora", content, accent: "#F08AC5" };
    setDocuments((current) => [newDocument, ...current]);
    setSelectedDocument(newDocument.id);
    setMessages((current) => [...current, { id: `upload-${Date.now()}`, role: "assistant", content: `“${newDocument.title}” foi adicionado. Agora vou usar apenas esse arquivo nas próximas respostas.` }]);
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#09100e]/90 px-4 text-white backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[var(--mint)] text-[#07110d] shadow-[0_0_30px_rgba(115,230,194,.16)]"><Sparkles className="size-[18px]" aria-hidden="true" /></div>
          <div><p className="text-[15px] font-semibold tracking-[-0.02em]">Lumina</p><p className="text-[11px] text-white/45">knowledge assistant</p></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 sm:inline-flex">MVP · busca contextual local</span>
          <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-sm font-semibold" aria-label="Perfil de Bruna">BE</button>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-1 lg:grid-cols-[285px_minmax(0,1fr)] xl:grid-cols-[285px_minmax(0,1fr)_330px]">
        <aside className="border-b border-[var(--line)] bg-[var(--panel)] p-4 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Biblioteca</p><p className="mt-1 text-sm text-[var(--muted)]">{documents.length} documentos</p></div>
            <Button variant="outline" size="icon" className="rounded-xl border-[var(--line)] bg-white" aria-label="Adicionar documento" asChild><label htmlFor="file-upload"><Plus className="size-4" /></label></Button>
            <Input id="file-upload" type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(event) => void onFile(event.target.files?.[0])} />
          </div>

          <button onClick={() => setSelectedDocument(null)} className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedDocument === null ? "bg-[#101b18] text-white shadow-lg shadow-black/8" : "text-[var(--ink)] hover:bg-black/[.035]"}`}>
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selectedDocument === null ? "bg-[var(--mint)] text-[#07110d]" : "bg-white"}`}><FolderOpen className="size-[17px]" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Todos os documentos</span><span className={`block text-xs ${selectedDocument === null ? "text-white/50" : "text-[var(--muted)]"}`}>Consultar a biblioteca inteira</span></span>
            {selectedDocument === null && <Check className="size-4 text-[var(--mint)]" />}
          </button>

          <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            {documents.map((item) => {
              const selected = selectedDocument === item.id;
              return <button key={item.id} onClick={() => setSelectedDocument(selected ? null : item.id)} className={`group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-[#bddfd5] bg-white shadow-[0_8px_30px_rgba(15,30,25,.06)]" : "border-transparent hover:border-[var(--line)] hover:bg-white/70"}`}>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-white shadow-sm"><FileText className="size-[18px]" /><span className="absolute bottom-1 right-1 size-1.5 rounded-full" style={{ background: item.accent }} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{item.type} · {item.pages} pág.</span></span>
              </button>;
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-[#b9cec7] bg-[#edf7f3] p-4">
            <Upload className="mb-3 size-5 text-[#1d7e64]" /><p className="text-sm font-semibold">Adicione seu conteúdo</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Nesta versão, envie arquivos TXT ou Markdown para testar a busca local.</p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full rounded-lg border-[#b9cec7] bg-white text-xs"><label htmlFor="file-upload">Escolher arquivo</label></Button>
          </div>
        </aside>

        <section className="flex min-h-[760px] flex-col bg-white">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-8">
            <div className="min-w-0"><div className="flex items-center gap-2"><BookOpenText className="size-4 text-[#237e68]" /><h1 className="truncate text-base font-semibold tracking-[-0.02em]">Consulta à base de conhecimento</h1></div><p className="mt-1 truncate text-xs text-[var(--muted)]">{selectedDocument ? "Usando 1 documento selecionado" : `Usando todos os ${documents.length} documentos`}</p></div>
            <Button variant="ghost" size="icon" className="rounded-xl xl:hidden" onClick={() => setShowSources((value) => !value)} aria-label="Mostrar fontes"><PanelRight className="size-4" /></Button>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#0c1714] text-[var(--mint)]"><Sparkles className="size-4" /></div>}
                <div className={`max-w-[82%] ${message.role === "user" ? "rounded-[20px_20px_6px_20px] bg-[#0d1b17] px-4 py-3 text-white" : "pt-1"}`}>
                  <p className={`text-[15px] leading-7 ${message.role === "assistant" ? "text-[#26332f]" : "text-white/90"}`}>{message.content}</p>
                  {!!message.sources?.length && <div className="mt-4 flex flex-wrap gap-2">{message.sources.map((source, index) => <button key={`${message.id}-${source.documentId}`} onClick={() => setSelectedDocument(source.documentId)} className="inline-flex items-center gap-2 rounded-full border border-[#cfe1db] bg-[#f4faf8] px-3 py-1.5 text-xs font-medium text-[#246f5d] hover:bg-[#e8f6f1]"><span className="grid size-4 place-items-center rounded-full bg-[#d5f2e8] text-[10px]">{index + 1}</span>{source.title}</button>)}</div>}
                </div>
              </article>)}

              {isThinking && <div className="flex items-center gap-3" aria-live="polite"><div className="grid size-8 place-items-center rounded-xl bg-[#0c1714] text-[var(--mint)]"><Sparkles className="size-4 animate-pulse" /></div><div className="flex gap-1.5 rounded-full bg-[var(--panel)] px-4 py-3">{[0, 1, 2].map((dot) => <span key={dot} className="size-1.5 animate-pulse rounded-full bg-[#5b756d]" style={{ animationDelay: `${dot * 120}ms` }} />)}</div></div>}

              {messages.length === 1 && <div className="pt-2"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Experimente perguntar</p><div className="grid gap-2 sm:grid-cols-3">{suggestedQuestions.map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left text-sm leading-5 transition hover:-translate-y-0.5 hover:border-[#a8cfc3] hover:bg-[#f2f9f6]">{suggestion}</button>)}</div></div>}
            </div>
          </div>

          <div className="border-t border-[var(--line)] bg-white px-4 py-4 sm:px-8 sm:py-5">
            <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-[#cad8d3] bg-white p-2 shadow-[0_14px_45px_rgba(17,36,30,.08)] transition focus-within:border-[#78bba8] focus-within:ring-4 focus-within:ring-[#72dbbd]/10">
                <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(question) } }} placeholder="Pergunte algo sobre seus documentos…" className="min-h-[64px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] shadow-none focus-visible:ring-0" aria-label="Pergunta para a base de conhecimento" />
                <div className="flex items-center justify-between px-2 pb-1"><span className="text-[11px] text-[var(--muted)]">Enter para enviar · Shift + Enter para quebrar linha</span><Button type="submit" size="icon" disabled={!question.trim() || isThinking} className="size-9 rounded-xl bg-[#0d1b17] text-[var(--mint)] hover:bg-[#1a3029]" aria-label="Enviar pergunta"><ArrowUp className="size-4" /></Button></div>
              </div>
              <p className="mt-2 text-center text-[11px] text-[var(--muted)]">O MVP usa busca contextual local. A geração por LLM será conectada na próxima etapa.</p>
            </form>
          </div>
        </section>

        <aside className={`${showSources ? "block" : "hidden"} border-t border-[var(--line)] bg-[var(--panel)] p-5 xl:block xl:border-l xl:border-t-0`}>
          <div className="flex items-center justify-between"><div><p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Fontes</p><p className="mt-1 text-sm text-[var(--muted)]">Trechos usados na resposta</p></div><Search className="size-[18px] text-[var(--muted)]" /></div>
          {latestSources.length ? <div className="mt-5 space-y-3">{latestSources.map((source, index) => <article key={`${source.documentId}-${source.excerpt}`} className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_8px_25px_rgba(25,44,38,.04)]"><div className="flex items-start justify-between gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#dff5ed] text-xs font-semibold text-[#246f5d]">{index + 1}</span><span className="rounded-full bg-[#f0f4f2] px-2 py-1 text-[10px] font-medium text-[var(--muted)]">{Math.round(source.score * 100)}% relevante</span></div><h2 className="mt-3 text-sm font-semibold">{source.title}</h2><p className="mt-1 text-[11px] text-[var(--muted)]">{source.location}</p><blockquote className="mt-3 border-l-2 border-[var(--mint)] pl-3 text-[13px] leading-5 text-[#4a5b55]">“{source.excerpt}”</blockquote></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-[#cbd8d4] p-5 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-white text-[#477269]"><BookOpenText className="size-[18px]" /></div><p className="mt-3 text-sm font-semibold">As fontes aparecerão aqui</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Faça uma pergunta para ver os trechos que sustentam a resposta.</p></div>}
          <button className="mt-5 flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left"><span><span className="block text-xs font-semibold">Como a resposta é formada</span><span className="mt-0.5 block text-[11px] text-[var(--muted)]">Entenda o nível de confiança</span></span><ChevronDown className="size-4 text-[var(--muted)]" /></button>
        </aside>
      </div>
    </main>
  );
}
