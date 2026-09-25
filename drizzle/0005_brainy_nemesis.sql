SET FOREIGN_KEY_CHECKS = 0;--> statement-breakpoint
CREATE TABLE `__new_subscriptions` (
	`id` integer PRIMARY KEY AUTO_INCREMENT NOT NULL,
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
	`createdAt` integer DEFAULT (UNIX_TIMESTAMP()) NOT NULL,
	`updatedAt` integer DEFAULT (UNIX_TIMESTAMP()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
--> statement-breakpoint
INSERT INTO `__new_subscriptions`("id", "userId", "plan", "stripeCustomerId", "stripeSubscriptionId", "stripePriceId", "stripeInterval", "cancelAtPeriodEnd", "analysesUsed", "analysesLimit", "casesLimit", "storageUsedBytes", "storageLimitBytes", "periodStart", "periodEnd", "active", "createdAt", "updatedAt") SELECT "id", "userId", "plan", "stripeCustomerId", "stripeSubscriptionId", "stripePriceId", "stripeInterval", "cancelAtPeriodEnd", "analysesUsed", "analysesLimit", "casesLimit", "storageUsedBytes", "storageLimitBytes", "periodStart", "periodEnd", "active", "createdAt", "updatedAt" FROM `subscriptions`;--> statement-breakpoint
DROP TABLE `subscriptions`;--> statement-breakpoint
ALTER TABLE `__new_subscriptions` RENAME TO `subscriptions`;--> statement-breakpoint
SET FOREIGN_KEY_CHECKS = 1;--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `subscriptions_plan_active_idx` ON `subscriptions` (`plan`,`active`);