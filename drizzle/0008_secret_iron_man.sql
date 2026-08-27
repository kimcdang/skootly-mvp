CREATE TABLE `breakdown_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escalationId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`notes` text NOT NULL,
	`clientNextAction` text,
	`proposedKnowledgeType` enum('principle','framework','diagnostic_rule','decision_rule','milestone','skoot_action','script','not_today','example'),
	`proposedKnowledgeContent` text,
	`reviewStatus` enum('pending','added','ignored') NOT NULL DEFAULT 'pending',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `breakdown_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_skoots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`bottleneckLabel` varchar(1000) NOT NULL,
	`occurrenceCount` int NOT NULL,
	`title` varchar(1000) NOT NULL,
	`format` varchar(300) NOT NULL,
	`outline` text NOT NULL,
	`identifiableConsent` boolean NOT NULL DEFAULT false,
	`status` enum('suggested','accepted','dismissed') NOT NULL DEFAULT 'suggested',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `content_skoots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_escalations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`supportProfileId` int,
	`relatedSkootId` int,
	`relatedRecommendationId` int,
	`packId` int,
	`escalationType` enum('csm','coach') NOT NULL,
	`routingReason` text NOT NULL,
	`bookingUrl` varchar(2048),
	`status` enum('requested','booked','completed','declined') NOT NULL DEFAULT 'requested',
	`createdAt` bigint NOT NULL,
	`resolvedAt` bigint,
	CONSTRAINT `smart_escalations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`userId` int,
	`routingLevel` enum('csm','coach') NOT NULL,
	`displayName` varchar(300) NOT NULL,
	`bookingUrl` varchar(2048),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `support_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `breakdown_notes` ADD CONSTRAINT `breakdown_notes_escalationId_smart_escalations_id_fk` FOREIGN KEY (`escalationId`) REFERENCES `smart_escalations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `breakdown_notes` ADD CONSTRAINT `breakdown_notes_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `breakdown_notes` ADD CONSTRAINT `breakdown_notes_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_skoots` ADD CONSTRAINT `content_skoots_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_escalations` ADD CONSTRAINT `smart_escalations_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_escalations` ADD CONSTRAINT `smart_escalations_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_escalations` ADD CONSTRAINT `smart_escalations_supportProfileId_support_profiles_id_fk` FOREIGN KEY (`supportProfileId`) REFERENCES `support_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_escalations` ADD CONSTRAINT `smart_escalations_relatedSkootId_skoots_id_fk` FOREIGN KEY (`relatedSkootId`) REFERENCES `skoots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_escalations` ADD CONSTRAINT `smart_escalations_relatedRecommendationId_recommendations_id_fk` FOREIGN KEY (`relatedRecommendationId`) REFERENCES `recommendations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_escalations` ADD CONSTRAINT `smart_escalations_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_profiles` ADD CONSTRAINT `support_profiles_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_profiles` ADD CONSTRAINT `support_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `breakdown_notes_escalation_idx` ON `breakdown_notes` (`escalationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `content_skoots_creator_idx` ON `content_skoots` (`creatorUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `smart_escalations_student_idx` ON `smart_escalations` (`studentUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `smart_escalations_creator_idx` ON `smart_escalations` (`creatorUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `support_profiles_creator_idx` ON `support_profiles` (`creatorUserId`,`routingLevel`,`active`);