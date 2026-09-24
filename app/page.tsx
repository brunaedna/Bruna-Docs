"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUp, BookOpenText, BriefcaseBusiness, Check, ChevronDown, Code2, FileText, FolderOpen, Languages, PanelRight, Plus, Search, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type KnowledgeDocument = { id: string; title: string; type: "PDF" | "DOCX" | "TXT"; pages: number; updated: string; content: string; accent: string; dataBase64?: string; mimeType?: string };
type Source = { documentId: string; title: string; excerpt: string; location: string; score: number };
type Message = { id: string; role: "assistant" | "user"; content: string; sources?: Source[] };
type ModelTool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute: (input: unknown) => unknown | Promise<unknown> };
type ModelContextDocument = Document & { modelContext?: { registerTool: (tool: ModelTool, options?: { signal?: AbortSignal }) => void | Promise<void> } };

const initialDocuments: KnowledgeDocument[] = [
  {
    id: "onboarding", title: "Manual de onboarding", type: "PDF", pages: 18, updated: "Hoje, 09:42", accent: "#6E65F7",
    content: "O onboarding dura duas semanas. No primeiro dia, a pessoa recebe os acessos essenciais, conhece sua liderança e revisa o plano de 30 dias. Na primeira semana, participa de sessões com Produto, Engenharia e Suporte. O buddy acompanha dúvidas operacionais e realiza checkpoints nos dias 3, 7 e 14. Ao final da segunda semana, liderança e colaborador revisam entregas iniciais, bloqueios e próximos objetivos.",
  },
  {
    id: "remote", title: "Política de trabalho remoto", type: "DOCX", pages: 9, updated: "Ontem, 16:18", accent: "#38A5FF",
    content: "O trabalho remoto é permitido em todo o território nacional. Cada equipe define uma janela de colaboração de quatro horas entre 10h e 17h no horário de Brasília. Reuniões devem ter pauta, responsável e registro de decisões. Despesas de internet podem ser reembolsadas em até R$ 150 por mês mediante comprovante. Equipamentos corporativos devem usar autenticação multifator e bloqueio automático.",
  },
  {
    id: "product", title: "Guia de produto — Q3", type: "PDF", pages: 24, updated: "12 set, 11:30", accent: "#B64DFF",
    content: "As prioridades do terceiro trimestre são reduzir o tempo até o primeiro valor, melhorar a busca e aumentar a confiança nas respostas. O indicador principal é a taxa de respostas úteis. Metas: reduzir o onboarding de 12 para 7 minutos, alcançar 85% de avaliações positivas e exibir fontes em 100% das respostas. A equipe também acompanhará tempo de resposta e custo por consulta.",
  },
];

const suggestedQuestions = ["Quanto tempo dura o onboarding?", "Qual é o limite de reembolso da internet?", "Quais são as metas do terceiro trimestre?"];
const uploadedDocumentQuestions = ["Faça um resumo deste documento", "Quais são os pontos principais?", "Em que idioma ele está escrito?"];

const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
  reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
  reader.readAsDataURL(file);
});

export default function Home() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: "Olá, Bruna. Posso localizar informações nos documentos e mostrar exatamente de onde cada resposta veio. O que você quer descobrir?" }]);
  const activeDocuments = useMemo(() => selectedDocument ? documents.filter((item) => item.id === selectedDocument) : documents, [documents, selectedDocument]);
  const activeSuggestions = selectedDocument?.startsWith("upload-") ? uploadedDocumentQuestions : suggestedQuestions;
  const latestSources = [...messages].reverse().find((message) => message.sources?.length)?.sources ?? [];

  const ask = useCallback(async (rawQuestion: string) => {
    const cleanQuestion = rawQuestion.trim();
    if (!cleanQuestion || isThinking) return null;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", content: cleanQuestion }]);
    setQuestion("");
    setIsThinking(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, documents: activeDocuments.map(({ id, title, type, content, dataBase64, mimeType }) => ({ id, title, type, content, dataBase64, mimeType })) }),
      });
      const result = await response.json() as { answer?: string; sources?: Source[]; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || "Não foi possível obter uma resposta.");
      const completed = { answer: result.answer, sources: result.sources ?? [] };
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: completed.answer, sources: completed.sources }]);
      return completed;
    } catch (error) {
      const content = error instanceof Error ? error.message : "Não foi possível consultar o Gemini agora.";
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content }]);
      return { answer: content, sources: [] };
    } finally {
      setIsThinking(false);
    }
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
    if (file.size > 6_000_000) {
      setMessages((current) => [...current, { id: `file-error-${Date.now()}`, role: "assistant", content: "Esse arquivo é maior que 6 MB. Para esta demonstração, escolha um documento menor." }]);
      return;
    }
    const filename = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || filename.endsWith(".pdf");
    const isDocx = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || filename.endsWith(".docx");
    try {
      let content = "";
      if (isDocx) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        content = result.value.trim();
        if (!content) throw new Error("Não encontrei texto legível nesse arquivo Word.");
      } else if (!isPdf) {
        content = await file.text();
      }
      const dataBase64 = isPdf ? await fileToBase64(file) : undefined;
      const newDocument: KnowledgeDocument = { id: `upload-${Date.now()}`, title: file.name.replace(/\.(txt|md|pdf|docx)$/i, ""), type: isPdf ? "PDF" : isDocx ? "DOCX" : "TXT", pages: isPdf ? 1 : Math.max(1, Math.ceil(content.length / 2200)), updated: "Agora", content, dataBase64, mimeType: isPdf ? "application/pdf" : file.type, accent: "#F08AC5" };
      setDocuments((current) => [newDocument, ...current]);
      setSelectedDocument(newDocument.id);
      setMessages((current) => [...current, { id: `upload-${Date.now()}`, role: "assistant", content: `“${newDocument.title}” foi adicionado. Agora vou usar apenas esse arquivo nas próximas respostas.` }]);
    } catch (error) {
      const content = error instanceof Error ? error.message : "Não foi possível ler esse arquivo.";
      setMessages((current) => [...current, { id: `file-error-${Date.now()}`, role: "assistant", content }]);
    }
  };

  return (
    <main className="ambient-shell min-h-screen bg-[var(--app-bg)] text-[var(--ink)]">
      <header className="brand-header sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/15 px-4 text-white backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3">
          <div className="brand-mark grid size-9 place-items-center rounded-xl text-[#5741c7]"><Sparkles className="size-[18px]" aria-hidden="true" /></div>
          <div><p className="text-[15px] font-semibold tracking-[-0.02em]">Bruna Docs</p><p className="text-[11px] text-white/45">assistente de documentos</p></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 sm:inline-flex">Gemini · consulta semântica</span>
          <Button variant="ghost" size="sm" onClick={() => setShowAbout(true)} className="hidden rounded-full border border-white/10 bg-white/5 text-xs text-white/75 hover:bg-white/10 hover:text-white sm:inline-flex"><BriefcaseBusiness className="size-3.5" />Sobre o projeto</Button>
          <button className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-sm font-semibold" aria-label="Perfil de Bruna">BE</button>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1600px] grid-cols-1 lg:h-[calc(100vh-64px)] lg:min-h-0 lg:grid-cols-[285px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[285px_minmax(0,1fr)_330px]">
        <aside className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden border-b border-[var(--line)] bg-[var(--panel)] p-4 lg:max-h-none lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Biblioteca</p><p className="mt-1 text-sm text-[var(--muted)]">{documents.length} documentos</p></div>
            <Button variant="outline" size="icon" className="rounded-xl border-[var(--line)] bg-white" aria-label="Adicionar documento" asChild><label htmlFor="file-upload"><Plus className="size-4" /></label></Button>
            <Input id="file-upload" type="file" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => void onFile(event.target.files?.[0])} />
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <button onClick={() => setSelectedDocument(null)} className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedDocument === null ? "bg-gradient-to-r from-[#7457f5] to-[#3975f7] text-white shadow-[0_12px_30px_rgba(92,73,224,.25)]" : "text-[var(--ink)] hover:bg-[#eceaff]"}`}>
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selectedDocument === null ? "bg-white/20 text-white" : "bg-white"}`}><FolderOpen className="size-[17px]" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Todos os documentos</span><span className={`block text-xs ${selectedDocument === null ? "text-white/50" : "text-[var(--muted)]"}`}>Consultar a biblioteca inteira</span></span>
            {selectedDocument === null && <Check className="size-4 text-white" />}
          </button>

          <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            {documents.map((item) => {
              const selected = selectedDocument === item.id;
              return <button key={item.id} onClick={() => setSelectedDocument(selected ? null : item.id)} className={`group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-[#bcb5ff] bg-white shadow-[0_10px_30px_rgba(100,78,225,.12)]" : "border-transparent hover:border-[var(--line)] hover:bg-white/75"}`}>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-white shadow-sm"><FileText className="size-[18px]" /><span className="absolute bottom-1 right-1 size-1.5 rounded-full" style={{ background: item.accent }} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{item.type} · {item.pages} pág.</span></span>
              </button>;
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-[#b9b2ff] bg-gradient-to-br from-[#efedff] to-[#ecf7ff] p-4 shadow-[0_12px_35px_rgba(95,78,214,.08)]">
            <Upload className="mb-3 size-5 text-[#654fe3]" /><p className="text-sm font-semibold">Adicione seu conteúdo</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Envie PDF, Word (.docx), TXT ou Markdown de até 6 MB para consultar com o Gemini.</p>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full rounded-lg border-[#c2bcff] bg-white text-xs text-[#5142ba] hover:bg-[#f4f2ff]"><label htmlFor="file-upload">Escolher arquivo</label></Button>
            <p className="mt-3 border-t border-[#d5d1ff] pt-3 text-[11px] leading-relaxed text-[#67647f]">O arquivo fica apenas nesta sessão e é removido quando a página é atualizada.</p>
          </div>
          </div>
        </aside>

        <section className="flex min-h-[760px] min-w-0 flex-col overflow-hidden bg-white lg:h-full lg:min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-8">
            <div className="min-w-0"><div className="flex items-center gap-2"><BookOpenText className="size-4 text-[#6755de]" /><h1 className="truncate text-base font-semibold tracking-[-0.02em]">Consulta à base de conhecimento</h1></div><p className="mt-1 truncate text-xs text-[var(--muted)]">{selectedDocument ? "Usando 1 documento selecionado" : `Usando todos os ${documents.length} documentos`}</p></div>
            <Button variant="ghost" size="icon" className="rounded-xl xl:hidden" onClick={() => setShowSources((value) => !value)} aria-label="Mostrar fontes"><PanelRight className="size-4" /></Button>
          </div>

          <div className="border-b border-[#ddd9ff] bg-gradient-to-r from-[#f1efff] via-[#f5f4ff] to-[#edf8ff] px-5 py-3 sm:px-8">
            <div className="mx-auto flex max-w-3xl items-start gap-3 text-xs leading-relaxed text-[#575477]"><BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-[#6755de]" /><p><strong className="font-semibold text-[#3f3789]">Demonstração de portfólio.</strong> Este projeto foi desenvolvido exclusivamente para apresentar habilidades em IA e desenvolvimento web. As consultas são limitadas pela cota gratuita do Gemini e podem ficar temporariamente indisponíveis quando o limite é atingido.</p></div>
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <div className="gradient-action grid size-8 shrink-0 place-items-center rounded-xl text-white"><Sparkles className="size-4" /></div>}
                <div className={`max-w-[82%] ${message.role === "user" ? "rounded-[20px_20px_6px_20px] bg-gradient-to-br from-[#7658f4] to-[#3476f7] px-4 py-3 text-white shadow-[0_10px_28px_rgba(91,72,220,.22)]" : "pt-1"}`}>
                  <p className={`text-[15px] leading-7 ${message.role === "assistant" ? "text-[#302f48]" : "text-white/95"}`}>{message.content}</p>
                  {!!message.sources?.length && <div className="mt-4 flex flex-wrap gap-2">{message.sources.map((source, index) => <button key={`${message.id}-${source.documentId}`} onClick={() => setSelectedDocument(source.documentId)} className="inline-flex items-center gap-2 rounded-full border border-[#cbc6ff] bg-[#f5f3ff] px-3 py-1.5 text-xs font-medium text-[#5747c0] hover:bg-[#ece9ff]"><span className="grid size-4 place-items-center rounded-full bg-[#ddd8ff] text-[10px]">{index + 1}</span>{source.title}</button>)}</div>}
                </div>
              </article>)}

              {isThinking && <div className="flex items-center gap-3" aria-live="polite"><div className="gradient-action grid size-8 place-items-center rounded-xl text-white"><Sparkles className="size-4 animate-pulse" /></div><div className="flex gap-1.5 rounded-full bg-[var(--panel)] px-4 py-3">{[0, 1, 2].map((dot) => <span key={dot} className="size-1.5 animate-pulse rounded-full bg-[#7565e8]" style={{ animationDelay: `${dot * 120}ms` }} />)}</div></div>}

              {(messages.length === 1 || selectedDocument?.startsWith("upload-")) && <div className="pt-2"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{selectedDocument?.startsWith("upload-") ? "Perguntas para este arquivo" : "Experimente perguntar"}</p><div className="grid gap-2 sm:grid-cols-3">{activeSuggestions.map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)} disabled={isThinking} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left text-sm leading-5 transition hover:-translate-y-0.5 hover:border-[#aaa1ff] hover:bg-[#eeecff] hover:shadow-[0_10px_24px_rgba(94,75,220,.1)] disabled:pointer-events-none disabled:opacity-50">{suggestion}</button>)}</div></div>}
            </div>
          </div>

          <div className="border-t border-[var(--line)] bg-white px-4 py-4 sm:px-8 sm:py-5">
            <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-[#cbc7ef] bg-white p-2 shadow-[0_14px_45px_rgba(79,65,170,.1)] transition focus-within:border-[#8f80ff] focus-within:ring-4 focus-within:ring-[#8878ff]/15">
                <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(question) } }} placeholder="Pergunte algo sobre seus documentos…" className="min-h-[64px] resize-none border-0 bg-transparent px-3 py-2 text-[15px] shadow-none focus-visible:ring-0" aria-label="Pergunta para a base de conhecimento" />
                <div className="flex items-center justify-between px-2 pb-1"><span className="text-[11px] text-[var(--muted)]">Enter para enviar · Shift + Enter para quebrar linha</span><Button type="submit" size="icon" disabled={!question.trim() || isThinking} className="gradient-action size-9 rounded-xl text-white" aria-label="Enviar pergunta"><ArrowUp className="size-4" /></Button></div>
              </div>
              <p className="mt-2 text-center text-[11px] text-[var(--muted)]">O Gemini responde somente com base nos documentos selecionados. Os arquivos não são salvos pelo Bruna Docs; evite conteúdo confidencial nesta demonstração.</p>
            </form>
          </div>
        </section>

        <aside className={`${showSources ? "flex" : "hidden"} max-h-[70vh] min-h-0 flex-col overflow-hidden border-t border-[var(--line)] bg-[var(--panel)] p-5 xl:flex xl:max-h-none xl:border-l xl:border-t-0`}>
          <div className="flex items-center justify-between"><div><p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Fontes</p><p className="mt-1 text-sm text-[var(--muted)]">Trechos usados na resposta</p></div><Search className="size-[18px] text-[var(--muted)]" /></div>
          <div className="scrollbar-thin mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          {latestSources.length ? <div className="space-y-3">{latestSources.map((source, index) => <article key={`${source.documentId}-${source.excerpt}`} className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_8px_25px_rgba(75,59,170,.06)]"><div className="flex items-start justify-between gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#dedaff] text-xs font-semibold text-[#5747c0]">{index + 1}</span><span className="rounded-full bg-[#ece9ff] px-2 py-1 text-[10px] font-medium text-[#5747c0]">Fonte utilizada</span></div><h2 className="mt-3 text-sm font-semibold">{source.title}</h2><p className="mt-1 text-[11px] text-[var(--muted)]">{source.location}</p><blockquote className="mt-3 border-l-2 border-[var(--mint)] pl-3 text-[13px] leading-5 text-[#56536d]">“{source.excerpt}”</blockquote></article>)}</div> : <div className="rounded-2xl border border-dashed border-[#c8c3ef] p-5 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl bg-white text-[#6254c7] shadow-[0_8px_22px_rgba(95,77,210,.12)]"><BookOpenText className="size-[18px]" /></div><p className="mt-3 text-sm font-semibold">As fontes aparecerão aqui</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Faça uma pergunta para ver os trechos que sustentam a resposta.</p></div>}
          <button onClick={() => setShowAbout(true)} className="mt-5 flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-[#b9b2ff] hover:bg-[#f5f3ff]"><span><span className="block text-xs font-semibold">Como o projeto funciona</span><span className="mt-0.5 block text-[11px] text-[var(--muted)]">Conheça o problema e a solução</span></span><ChevronDown className="size-4 text-[var(--muted)]" /></button>
          </div>
        </aside>
      </div>

      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl border-[#d7e4df] p-0 sm:max-w-2xl">
          <div className="brand-header rounded-t-3xl px-6 py-6 text-white sm:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white"><BriefcaseBusiness className="size-3.5" />Projeto de portfólio</span>
            <DialogHeader className="mt-4 text-left">
              <DialogTitle className="text-2xl tracking-[-0.03em] text-white">Bruna Docs</DialogTitle>
              <DialogDescription className="max-w-xl text-sm leading-6 text-white/60">Assistente de conhecimento que transforma documentos em respostas diretas, multilíngues e fundamentadas em fontes visíveis.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 px-6 pb-7 sm:grid-cols-2 sm:px-8">
            <article className="rounded-2xl border border-[#dedaff] bg-gradient-to-br from-[#f8f7ff] to-[#eef7ff] p-4"><BookOpenText className="size-5 text-[#6755de]" /><h2 className="mt-3 text-sm font-semibold">Problema</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Encontrar uma informação específica em documentos extensos consome tempo e exige leitura manual.</p></article>
            <article className="rounded-2xl border border-[#dedaff] bg-gradient-to-br from-[#f8f7ff] to-[#eef7ff] p-4"><Languages className="size-5 text-[#6755de]" /><h2 className="mt-3 text-sm font-semibold">Solução</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">O Gemini interpreta PDF, Word (.docx), TXT e Markdown, responde no idioma da pergunta e mostra os trechos utilizados.</p></article>
            <article className="rounded-2xl border border-[#dedaff] bg-gradient-to-br from-[#f8f7ff] to-[#eef7ff] p-4"><Code2 className="size-5 text-[#6755de]" /><h2 className="mt-3 text-sm font-semibold">Tecnologias</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">React, TypeScript, Gemini API, processamento server-side e hospedagem em Cloudflare Workers.</p></article>
            <article className="rounded-2xl border border-[#dedaff] bg-gradient-to-br from-[#f8f7ff] to-[#eef7ff] p-4"><ShieldCheck className="size-5 text-[#6755de]" /><h2 className="mt-3 text-sm font-semibold">Desafios resolvidos</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Proteção da chave de API, respostas baseadas apenas no documento, fontes rastreáveis e controle da cota gratuita.</p></article>
          </div>
          <div className="mx-6 mb-6 rounded-2xl border border-[#f0dba5] bg-[#fff9e9] p-4 text-sm leading-6 text-[#6e5924] sm:mx-8"><strong className="font-semibold">Nota da demonstração:</strong> o Bruna Docs foi desenvolvido exclusivamente para portfólio. O número de perguntas é limitado pela cota gratuita do Gemini, e os arquivos enviados permanecem somente durante a sessão atual.</div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
