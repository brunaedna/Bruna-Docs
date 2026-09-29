import assert from "node:assert/strict";
import test from "node:test";
import {
  hashRateLimitKey,
  isDistributedRateLimited,
  type RateLimitDatabase,
} from "../lib/request-rate-limit.ts";

function databaseReturning(requestCount: number) {
  let boundValues: unknown[] = [];
  const statement = {
    bind(...values: unknown[]) {
      boundValues = values;
      return statement;
    },
    async first<T>() {
      return { request_count: requestCount } as T;
    },
  };
  return {
    database: { prepare: () => statement } as RateLimitDatabase,
    values: () => boundValues,
  };
}

test("permite requisições até o limite distribuído", async () => {
  const mock = databaseReturning(12);
  assert.equal(
    await isDistributedRateLimited(mock.database, "203.0.113.10", 650_000),
    false,
  );
  assert.equal(mock.values()[1], 600_000);
});

test("bloqueia a requisição que ultrapassa o limite distribuído", async () => {
  const mock = databaseReturning(13);
  assert.equal(
    await isDistributedRateLimited(mock.database, "203.0.113.10", 650_000),
    true,
  );
});

test("não armazena o endereço IP em texto puro", async () => {
  const hash = await hashRateLimitKey("203.0.113.10");
  assert.equal(hash.length, 64);
  assert.equal(hash.includes("203.0.113.10"), false);
});
