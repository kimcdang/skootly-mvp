CREATE TABLE `daily_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`experimentVersion` enum('founder','coach','client_success') NOT NULL,
	`goal` text NOT NULL,
	`currentState` text NOT NULL,
	`blocker` text NOT NULL,
	`availableTime` enum('15_minutes','30_minutes','60_minutes','90_plus_minutes') NOT NULL,
	`energyLevel` enum('low','steady','high') NOT NULL,
	`metricName` varchar(160),
	`currentValue` varchar(120),
	`targetValue` varchar(120),
	`opportunities` text,
	`constraints` text,
	`optionalContext` text,
	`status` enum('pending','recommended','needs_clarification') NOT NULL DEFAULT 'pending',
	`clarificationQuestion` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `daily_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experiment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(96),
	`experimentVersion` varchar(32) NOT NULL,
	`eventName` enum('landing_page_view','onboarding_started','onboarding_completed','skoot_generated','skoot_completed','skoot_skipped','outcome_reported','signup_started','signup_completed','feedback_recorded') NOT NULL,
	`metadata` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `experiment_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`checkinId` int NOT NULL,
	`experimentVersion` enum('founder','coach','client_success') NOT NULL,
	`goalSummary` text NOT NULL,
	`bottleneck` text NOT NULL,
	`rationale` text NOT NULL,
	`notTodayReason` text NOT NULL,
	`notTodayItems` text NOT NULL,
	`modelId` varchar(120) NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skoot_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`skootId` int NOT NULL,
	`outcomeType` enum('no_result_yet','made_progress','completed_milestone','received_reply','booked_call','generated_revenue','retained_client','other') NOT NULL,
	`measurableOutcome` text,
	`revenueAmount` decimal(14,2),
	`notes` text,
	`userFeedback` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `skoot_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skoots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`checkinId` int NOT NULL,
	`recommendationId` int NOT NULL,
	`experimentVersion` enum('founder','coach','client_success') NOT NULL,
	`title` text NOT NULL,
	`reasoning` text NOT NULL,
	`estimatedImpact` enum('low','medium','high') NOT NULL,
	`position` int NOT NULL,
	`status` enum('active','completed','skipped') NOT NULL DEFAULT 'active',
	`createdAt` bigint NOT NULL,
	`completedAt` bigint,
	CONSTRAINT `skoots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`experimentVersion` enum('founder','coach','client_success') NOT NULL,
	`participantName` varchar(200) NOT NULL,
	`perceivedPurpose` text NOT NULL,
	`wouldUse` enum('definitely','maybe','no') NOT NULL,
	`wouldPay` enum('yes','maybe','no') NOT NULL,
	`suggestedMonthlyPrice` decimal(10,2),
	`mostInterestingFeature` text,
	`confusion` text,
	`notes` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `validation_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `daily_checkins` ADD CONSTRAINT `daily_checkins_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `experiment_events` ADD CONSTRAINT `experiment_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_checkinId_daily_checkins_id_fk` FOREIGN KEY (`checkinId`) REFERENCES `daily_checkins`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_outcomes` ADD CONSTRAINT `skoot_outcomes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_outcomes` ADD CONSTRAINT `skoot_outcomes_skootId_skoots_id_fk` FOREIGN KEY (`skootId`) REFERENCES `skoots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoots` ADD CONSTRAINT `skoots_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoots` ADD CONSTRAINT `skoots_checkinId_daily_checkins_id_fk` FOREIGN KEY (`checkinId`) REFERENCES `daily_checkins`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoots` ADD CONSTRAINT `skoots_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `validation_feedback` ADD CONSTRAINT `validation_feedback_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_checkins_user_created_idx` ON `daily_checkins` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `daily_checkins_experiment_idx` ON `daily_checkins` (`experimentVersion`);--> statement-breakpoint
CREATE INDEX `experiment_events_version_event_idx` ON `experiment_events` (`experimentVersion`,`eventName`);--> statement-breakpoint
CREATE INDEX `recommendations_user_created_idx` ON `recommendations` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `recommendations_checkin_idx` ON `recommendations` (`checkinId`);--> statement-breakpoint
CREATE INDEX `skoot_outcomes_user_created_idx` ON `skoot_outcomes` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `skoots_user_status_idx` ON `skoots` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `skoots_recommendation_idx` ON `skoots` (`recommendationId`);--> statement-breakpoint
CREATE INDEX `validation_feedback_user_experiment_idx` ON `validation_feedback` (`userId`,`experimentVersion`);