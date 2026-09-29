import { BookOpenText, ChevronDown, Search } from "lucide-react";
import type { Source } from "@/lib/knowledge/types";

type SourcesSidebarProps = {
  isVisible: boolean;
  sources: Source[];
  onAbout: () => void;
};

export function SourcesSidebar({
  isVisible,
  sources,
  onAbout,
}: SourcesSidebarProps) {
  return (
    <aside
      className={`${isVisible ? "flex" : "hidden"} max-h-[70vh] min-h-0 flex-col overflow-hidden border-t border-[var(--line)] bg-[var(--panel)] p-5 xl:flex xl:max-h-none xl:border-l xl:border-t-0`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Fontes
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Trechos usados na resposta
          </p>
        </div>
        <Search className="size-[18px] text-[var(--muted)]" />
      </div>
      <div className="scrollbar-thin mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {sources.length ? (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <article
                key={`${source.documentId}-${source.excerpt}`}
                className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_8px_25px_rgba(75,59,170,.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#dedaff] text-xs font-semibold text-[#5747c0]">
                    {index + 1}
                  </span>
                  <span className="rounded-full bg-[#ece9ff] px-2 py-1 text-[10px] font-medium text-[#5747c0]">
                    Fonte utilizada
                  </span>
                </div>
                <h2 className="mt-3 text-sm font-semibold">{source.title}</h2>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  {source.location}
                </p>
                <blockquote className="mt-3 border-l-2 border-[var(--mint)] pl-3 text-[13px] leading-5 text-[#56536d]">
                  “{source.excerpt}”
                </blockquote>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#c8c3ef] p-5 text-center">
            <div className="mx-auto grid size-10 place-items-center rounded-xl bg-white text-[#6254c7] shadow-[0_8px_22px_rgba(95,77,210,.12)]">
              <BookOpenText className="size-[18px]" />
            </div>
            <p className="mt-3 text-sm font-semibold">
              As fontes aparecerão aqui
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Faça uma pergunta para ver os trechos que sustentam a resposta.
            </p>
          </div>
        )}
        <button
          onClick={onAbout}
          className="mt-5 flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-[#b9b2ff] hover:bg-[#f5f3ff]"
        >
          <span>
            <span className="block text-xs font-semibold">
              Como o projeto funciona
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
              Conheça o problema e a solução
            </span>
          </span>
          <ChevronDown className="size-4 text-[var(--muted)]" />
        </button>
      </div>
    </aside>
  );
}
