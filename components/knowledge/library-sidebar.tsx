import { Check, FileText, FolderOpen, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KnowledgeDocument } from "@/lib/knowledge/types";

type LibrarySidebarProps = {
  documents: KnowledgeDocument[];
  selectedDocument: string | null;
  onSelect: (id: string | null) => void;
  onFile: (file?: File) => void;
};

export function LibrarySidebar({
  documents,
  selectedDocument,
  onSelect,
  onFile,
}: LibrarySidebarProps) {
  return (
    <aside className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden border-b border-[var(--line)] bg-[var(--panel)] p-4 lg:max-h-none lg:border-b-0 lg:border-r lg:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Biblioteca
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {documents.length} documentos
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl border-[var(--line)] bg-white"
          aria-label="Adicionar documento"
          asChild
        >
          <label htmlFor="file-upload">
            <Plus className="size-4" />
          </label>
        </Button>
        <Input
          id="file-upload"
          type="file"
          accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <button
          onClick={() => onSelect(null)}
          className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedDocument === null ? "bg-gradient-to-r from-[#7457f5] to-[#3975f7] text-white shadow-[0_12px_30px_rgba(92,73,224,.25)]" : "text-[var(--ink)] hover:bg-[#eceaff]"}`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-lg ${selectedDocument === null ? "bg-white/20 text-white" : "bg-white"}`}
          >
            <FolderOpen className="size-[17px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              Todos os documentos
            </span>
            <span
              className={`block text-xs ${selectedDocument === null ? "text-white/50" : "text-[var(--muted)]"}`}
            >
              Consultar a biblioteca inteira
            </span>
          </span>
          {selectedDocument === null && <Check className="size-4 text-white" />}
        </button>

        <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
          {documents.map((item) => {
            const selected = selectedDocument === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(selected ? null : item.id)}
                className={`group flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${selected ? "border-[#bcb5ff] bg-white shadow-[0_10px_30px_rgba(100,78,225,.12)]" : "border-transparent hover:border-[var(--line)] hover:bg-white/75"}`}
              >
                <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
                  <FileText className="size-[18px]" />
                  <span
                    className="absolute bottom-1 right-1 size-1.5 rounded-full"
                    style={{ background: item.accent }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                    {item.type} · {item.pages} pág.
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-[#b9b2ff] bg-gradient-to-br from-[#efedff] to-[#ecf7ff] p-4 shadow-[0_12px_35px_rgba(95,78,214,.08)]">
          <Upload className="mb-3 size-5 text-[#654fe3]" />
          <p className="text-sm font-semibold">Adicione seu conteúdo</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            Envie PDF, Word (.docx), TXT ou Markdown de até 6 MB para consultar
            com o Gemini.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3 w-full rounded-lg border-[#c2bcff] bg-white text-xs text-[#5142ba] hover:bg-[#f4f2ff]"
          >
            <label htmlFor="file-upload">Escolher arquivo</label>
          </Button>
          <p className="mt-3 border-t border-[#d5d1ff] pt-3 text-[11px] leading-relaxed text-[#67647f]">
            O arquivo fica apenas nesta sessão e é removido quando a página é
            atualizada.
          </p>
        </div>
      </div>
    </aside>
  );
}
