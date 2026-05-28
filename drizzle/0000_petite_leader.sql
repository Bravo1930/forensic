CREATE TABLE `analyses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caseId` integer NOT NULL,
	`userId` integer NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`result` text,
	`error` text,
	`tokensUsed` integer,
	`costUsd` real,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'activo' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caseId` integer NOT NULL,
	`userId` integer NOT NULL,
	`originalName` text NOT NULL,
	`s3Key` text NOT NULL,
	`s3Url` text NOT NULL,
	`mimeType` text,
	`sizeBytes` integer NOT NULL,
	`metadata` text,
	`extractedText` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `image_comparisons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caseId` integer NOT NULL,
	`userId` integer NOT NULL,
	`evidenceAId` integer NOT NULL,
	`evidenceBId` integer NOT NULL,
	`resultJson` text,
	`similarityScore` real,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidenceAId`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evidenceBId`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caseId` integer NOT NULL,
	`analysisId` integer NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'generando' NOT NULL,
	`s3Key` text,
	`s3Url` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`analysisId`) REFERENCES `analyses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stripeEventId` text NOT NULL,
	`type` text NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_events_stripeEventId_unique` ON `stripe_events` (`stripeEventId`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`analysesUsed` integer DEFAULT 0 NOT NULL,
	`analysesLimit` integer DEFAULT 3 NOT NULL,
	`casesLimit` integer DEFAULT 5 NOT NULL,
	`storageUsedBytes` integer DEFAULT 0 NOT NULL,
	`storageLimitBytes` integer DEFAULT 524288000 NOT NULL,
	`periodStart` integer NOT NULL,
	`periodEnd` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`lastSignedIn` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);