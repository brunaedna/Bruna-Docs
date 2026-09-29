import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const requestRateLimits = sqliteTable("request_rate_limits", {
  keyHash: text("key_hash").notNull(),
  windowStart: integer("window_start").notNull(),
  requestCount: integer("request_count").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
}, (table) => ({
  primary: primaryKey({ columns: [table.keyHash, table.windowStart] }),
  expiresIndex: index("request_rate_limits_expires_idx").on(table.expiresAt),
}));
