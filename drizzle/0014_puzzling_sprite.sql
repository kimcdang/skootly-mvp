CREATE TABLE `mcp_feedback_confirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`enrollmentId` int NOT NULL,
	`milestonePosition` int NOT NULL,
	`feedbackStatus` enum('done','stuck','not_today') NOT NULL,
	`detail` text,
	`expiresAt` bigint NOT NULL,
	`usedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `mcp_feedback_confirmations_id` PRIMARY KEY(`id`),
	CONSTRAINT `mcp_feedback_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `mcp_feedback_confirmations` ADD CONSTRAINT `mcp_feedback_confirmations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mcp_feedback_confirmations` ADD CONSTRAINT `mcp_feedback_confirmations_enrollmentId_creator_pack_enrollments_id_fk` FOREIGN KEY (`enrollmentId`) REFERENCES `creator_pack_enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mcp_feedback_user_expiry` ON `mcp_feedback_confirmations` (`userId`,`expiresAt`);