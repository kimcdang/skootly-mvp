CREATE TABLE `business_action_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actionId` int NOT NULL,
	`contactsContacted` int NOT NULL DEFAULT 0,
	`replies` int NOT NULL DEFAULT 0,
	`bookings` int NOT NULL DEFAULT 0,
	`purchases` int NOT NULL DEFAULT 0,
	`outcomeValue` decimal(14,2),
	`notes` text,
	`learningNote` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `business_action_outcomes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessProfileId` int NOT NULL,
	`title` varchar(700) NOT NULL,
	`description` text NOT NULL,
	`priorityScore` int NOT NULL,
	`source` enum('highlevel','manual','playbook') NOT NULL,
	`signal` text NOT NULL,
	`recommendedAction` text NOT NULL,
	`estimatedValue` decimal(14,2),
	`assignedTo` varchar(240),
	`relatedContactIds` text,
	`relatedContactUrls` text,
	`status` enum('recommended','in_progress','completed','dismissed') NOT NULL DEFAULT 'recommended',
	`playbookId` varchar(120),
	`createdAt` bigint NOT NULL,
	`completedAt` bigint,
	`dismissedAt` bigint,
	CONSTRAINT `business_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(300) NOT NULL,
	`primaryGoal` text NOT NULL,
	`monthlyRevenueGoal` decimal(14,2),
	`primaryOffer` varchar(400),
	`offerPrice` decimal(14,2),
	`primaryAcquisitionMethod` varchar(400),
	`importantNotes` text,
	`currentBottleneck` text,
	`defaultPlaybookId` varchar(120) NOT NULL DEFAULT 'core_revenue_focus',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `business_action_outcomes` ADD CONSTRAINT `business_action_outcomes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_action_outcomes` ADD CONSTRAINT `business_action_outcomes_actionId_business_actions_id_fk` FOREIGN KEY (`actionId`) REFERENCES `business_actions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_actions` ADD CONSTRAINT `business_actions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_actions` ADD CONSTRAINT `business_actions_businessProfileId_business_profiles_id_fk` FOREIGN KEY (`businessProfileId`) REFERENCES `business_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD CONSTRAINT `business_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `business_action_outcomes_owner_idx` ON `business_action_outcomes` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `business_actions_owner_status_idx` ON `business_actions` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `business_actions_profile_score_idx` ON `business_actions` (`businessProfileId`,`priorityScore`);