PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`stripePriceId` text,
	`stripeInterval` text,
	`cancelAtPeriodEnd` integer DEFAULT false NOT NULL,
	`analysesUsed` integer DEFAULT 0 NOT NULL,
	`analysesLimit` integer DEFAULT 3 NOT NULL,
	`casesLimit` integer DEFAULT 3 NOT NULL,
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
INSERT INTO `__new_subscriptions`("id", "userId", "plan", "stripeCustomerId", "stripeSubscriptionId", "stripePriceId", "stripeInterval", "cancelAtPeriodEnd", "analysesUsed", "analysesLimit", "casesLimit", "storageUsedBytes", "storageLimitBytes", "periodStart", "periodEnd", "active", "createdAt", "updatedAt") SELECT "id", "userId", "plan", "stripeCustomerId", "stripeSubscriptionId", "stripePriceId", "stripeInterval", "cancelAtPeriodEnd", "analysesUsed", "analysesLimit", "casesLimit", "storageUsedBytes", "storageLimitBytes", "periodStart", "periodEnd", "active", "createdAt", "updatedAt" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `subscriptions_plan_active_idx` ON `subscriptions` (`plan`,`active`);
