type Wait = (durationMs: number) => Promise<void>;

type PacedTextOptions = {
  reducedMotion?: boolean;
  intervalMs?: number;
  fastIntervalMs?: number;
  fastBacklogSize?: number;
  wait?: Wait;
};

export type PacedTextPresenter = {
  push(text: string): void;
  finish(): Promise<void>;
  cancel(): void;
};

const DEFAULT_INTERVAL_MS = 28;
const DEFAULT_FAST_INTERVAL_MS = 7;
const DEFAULT_FAST_BACKLOG_SIZE = 120;

function splitIntoWords(text: string) {
  return text.match(/\S+\s*|\s+/g) ?? [];
}

function delay(durationMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));
}

export function createPacedTextPresenter(
  reveal: (text: string) => void,
  options: PacedTextOptions = {},
): PacedTextPresenter {
  const reducedMotion = options.reducedMotion ?? false;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const fastIntervalMs = options.fastIntervalMs ?? DEFAULT_FAST_INTERVAL_MS;
  const fastBacklogSize = options.fastBacklogSize ?? DEFAULT_FAST_BACKLOG_SIZE;
  const wait = options.wait ?? delay;
  const queue: string[] = [];
  let pendingCharacters = 0;
  let runner: Promise<void> | null = null;
  let cancelled = false;

  const drain = async () => {
    while (!cancelled && queue.length > 0) {
      const nextWord = queue.shift();
      if (!nextWord) continue;
      pendingCharacters -= nextWord.length;
      reveal(nextWord);

      if (queue.length > 0) {
        await wait(
          pendingCharacters > fastBacklogSize ? fastIntervalMs : intervalMs,
        );
      }
    }
  };

  const start = () => {
    if (runner || cancelled) return;
    runner = drain().finally(() => {
      runner = null;
      if (queue.length > 0 && !cancelled) start();
    });
  };

  return {
    push(text) {
      if (!text || cancelled) return;
      if (reducedMotion) {
        reveal(text);
        return;
      }

      const words = splitIntoWords(text);
      queue.push(...words);
      pendingCharacters += text.length;
      start();
    },
    async finish() {
      while (runner) await runner;
    },
    cancel() {
      cancelled = true;
      queue.length = 0;
      pendingCharacters = 0;
    },
  };
}
