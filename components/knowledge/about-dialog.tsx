import {
  BookOpenText,
  BriefcaseBusiness,
  Code2,
  Languages,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AboutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PROJECT_HIGHLIGHTS = [
  {
    title: "Problema",
    icon: BookOpenText,
    description:
      "Encontrar uma informação específica em documentos extensos consome tempo e exige leitura manual.",
  },
  {
    title: "Solução",
    icon: Languages,
    description:
      "Quando há texto extraído, o Bruna Docs fragmenta e recupera o contexto relevante antes de o Gemini responder e mostrar as fontes.",
  },
  {
    title: "Tecnologias",
    icon: Code2,
    description:
      "React, TypeScript, embeddings do Gemini, recuperação vetorial, busca lexical de contingência e Cloudflare Workers.",
  },
  {
    title: "Desafios resolvidos",
    icon: ShieldCheck,
    description:
      "Proteção da chave, contexto limitado aos trechos recuperados, fontes rastreáveis, fallback resiliente e controle da cota.",
  },
];

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-3xl border-[#d7e4df] p-0 sm:max-w-2xl">
        <div className="brand-header rounded-t-3xl px-6 py-6 text-white sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
            <BriefcaseBusiness className="size-3.5" />
            Projeto de portfólio
          </span>
          <DialogHeader className="mt-4 text-left">
            <DialogTitle className="text-2xl tracking-[-0.03em] text-white">
              Bruna Docs
            </DialogTitle>
            <DialogDescription className="max-w-xl text-sm leading-6 text-white/60">
              Assistente de conhecimento que transforma documentos em respostas
              diretas, multilíngues e fundamentadas em fontes visíveis.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="grid gap-4 px-6 pb-7 sm:grid-cols-2 sm:px-8">
          {PROJECT_HIGHLIGHTS.map(({ title, icon: Icon, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-[#dedaff] bg-gradient-to-br from-[#f8f7ff] to-[#eef7ff] p-4"
            >
              <Icon className="size-5 text-[#6755de]" />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {description}
              </p>
            </article>
          ))}
        </div>
        <div className="mx-6 mb-6 rounded-2xl border border-[#f0dba5] bg-[#fff9e9] p-4 text-sm leading-6 text-[#6e5924] sm:mx-8">
          <strong className="font-semibold">Nota da demonstração:</strong> o
          Bruna Docs foi desenvolvido exclusivamente para portfólio. O número de
          perguntas é limitado pela cota gratuita do Gemini, e os arquivos
          enviados permanecem somente durante a sessão atual.
        </div>
      </DialogContent>
    </Dialog>
  );
}
