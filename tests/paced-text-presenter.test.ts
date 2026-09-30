import assert from "node:assert/strict";
import test from "node:test";
import { createPacedTextPresenter } from "../lib/knowledge/paced-text-presenter.ts";

test("revela fragmentos palavra por palavra preservando os espaços", async () => {
  const revealed: string[] = [];
  const intervals: number[] = [];
  const presenter = createPacedTextPresenter((text) => revealed.push(text), {
    intervalMs: 25,
    fastBacklogSize: 1_000,
    wait: async (interval) => {
      intervals.push(interval);
    },
  });

  presenter.push("Uma resposta em streaming.");
  await presenter.finish();

  assert.deepEqual(revealed, ["Uma ", "resposta ", "em ", "streaming."]);
  assert.equal(revealed.join(""), "Uma resposta em streaming.");
  assert.deepEqual(intervals, [25, 25, 25]);
});

test("acelera a apresentação quando existe texto acumulado", async () => {
  const intervals: number[] = [];
  const presenter = createPacedTextPresenter(() => undefined, {
    intervalMs: 30,
    fastIntervalMs: 5,
    fastBacklogSize: 10,
    wait: async (interval) => {
      intervals.push(interval);
    },
  });

  presenter.push("primeira segunda terceira quarta");
  await presenter.finish();

  assert.equal(intervals[0], 5);
  assert.equal(intervals.at(-1), 30);
});

test("mostra o fragmento imediatamente quando movimentos são reduzidos", async () => {
  const revealed: string[] = [];
  const presenter = createPacedTextPresenter((text) => revealed.push(text), {
    reducedMotion: true,
  });

  presenter.push("Texto completo sem animação.");
  await presenter.finish();

  assert.deepEqual(revealed, ["Texto completo sem animação."]);
});

test("descarta palavras pendentes ao cancelar", async () => {
  const revealed: string[] = [];
  let releaseWait = () => undefined;
  const presenter = createPacedTextPresenter((text) => revealed.push(text), {
    wait: () =>
      new Promise<void>((resolve) => {
        releaseWait = resolve;
      }),
  });

  presenter.push("primeira segunda terceira");
  presenter.cancel();
  releaseWait();
  await presenter.finish();

  assert.deepEqual(revealed, ["primeira "]);
});
