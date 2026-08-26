CREATE TABLE `learning_homework_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceId` int NOT NULL,
	`title` text NOT NULL,
	`details` text,
	`engagementType` enum('complete_lesson','complete_homework','post_progress','ask_question','reply_to_discussion') NOT NULL DEFAULT 'complete_homework',
	`status` enum('pending','completed','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`completedAt` bigint,
	CONSTRAINT `learning_homework_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_source_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceHash` varchar(64) NOT NULL,
	`action` enum('imported','deleted') NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `learning_source_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('skool_manual','other_manual') NOT NULL,
	`title` varchar(300) NOT NULL,
	`communityName` varchar(300),
	`lessonUrl` varchar(2048),
	`sourceDate` bigint,
	`transcript` text,
	`homework` text,
	`normalizedConcepts` text,
	`sourceHash` varchar(64) NOT NULL,
	`consentedAt` bigint NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `learning_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_sources_user_hash_idx` UNIQUE(`userId`,`sourceHash`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_learning_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recommendationId` int NOT NULL,
	`sourceId` int NOT NULL,
	`citationReason` varchar(500) NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `recommendation_learning_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `recommendation_learning_source_unique_idx` UNIQUE(`recommendationId`,`sourceId`)
);
--> statement-breakpoint
ALTER TABLE `learning_homework_items` ADD CONSTRAINT `learning_homework_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_homework_items` ADD CONSTRAINT `learning_homework_items_sourceId_learning_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `learning_sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_source_audit` ADD CONSTRAINT `learning_source_audit_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_sources` ADD CONSTRAINT `learning_sources_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_learning_sources` ADD CONSTRAINT `recommendation_learning_sources_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_learning_sources` ADD CONSTRAINT `recommendation_learning_sources_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendation_learning_sources` ADD CONSTRAINT `recommendation_learning_sources_sourceId_learning_sources_id_fk` FOREIGN KEY (`sourceId`) REFERENCES `learning_sources`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `learning_homework_user_status_idx` ON `learning_homework_items` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `learning_homework_source_idx` ON `learning_homework_items` (`sourceId`);--> statement-breakpoint
CREATE INDEX `learning_source_audit_user_created_idx` ON `learning_source_audit` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `learning_sources_user_enabled_idx` ON `learning_sources` (`userId`,`enabled`);--> statement-breakpoint
CREATE INDEX `recommendation_learning_source_user_idx` ON `recommendation_learning_sources` (`userId`,`sourceId`);