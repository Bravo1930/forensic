ALTER TABLE `analyses` ADD `title` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `keyFindings` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `timelineEvents` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `relationshipGraph` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `processingTimeMs` integer;--> statement-breakpoint
ALTER TABLE `analyses` ADD `evidenceCount` integer;--> statement-breakpoint
ALTER TABLE `analyses` ADD `executiveSummary` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `expertOpinion` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `inconsistencies` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `suspiciousPatterns` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `prosecutionTheory` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `defenseTheory` text;--> statement-breakpoint
ALTER TABLE `analyses` ADD `criticalAlertSent` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `cases` ADD `caseNumber` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `caseType` text NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `jurisdiction` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `clientName` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `opposingParty` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `court` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `hearingDate` integer;--> statement-breakpoint
ALTER TABLE `cases` ADD `priority` text DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE `cases` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `evidence` ADD `evidenceType` text;--> statement-breakpoint
ALTER TABLE `evidence` ADD `isKeyEvidence` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `evidence` ADD `description` text;--> statement-breakpoint
ALTER TABLE `image_comparisons` ADD `manipulationLikelihood` text;--> statement-breakpoint
ALTER TABLE `image_comparisons` ADD `differenceCount` integer;--> statement-breakpoint
ALTER TABLE `image_comparisons` ADD `errorMessage` text;--> statement-breakpoint
ALTER TABLE `reports` ADD `format` text DEFAULT 'pdf' NOT NULL;--> statement-breakpoint
ALTER TABLE `stripe_events` ADD `eventType` text NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripePriceId` text;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeInterval` text;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `cancelAtPeriodEnd` integer DEFAULT false NOT NULL;