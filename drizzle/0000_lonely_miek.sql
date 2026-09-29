CREATE TABLE `request_rate_limits` (
	`key_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`key_hash`, `window_start`)
);
--> statement-breakpoint
CREATE INDEX `request_rate_limits_expires_idx` ON `request_rate_limits` (`expires_at`);