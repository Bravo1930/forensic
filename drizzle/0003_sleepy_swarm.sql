CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`refreshToken` text NOT NULL,
	`jti` text NOT NULL,
	`userAgent` text,
	`ipAddress` text,
	`issuedAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`revokedAt` integer,
	`rotatedByToken` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refreshToken_unique` ON `sessions` (`refreshToken`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_jti_unique` ON `sessions` (`jti`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_refresh_token_idx` ON `sessions` (`refreshToken`);--> statement-breakpoint
CREATE INDEX `sessions_jti_idx` ON `sessions` (`jti`);