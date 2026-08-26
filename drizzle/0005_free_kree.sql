CREATE TABLE `skoot_conversation_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','skoot') NOT NULL,
	`content` text NOT NULL,
	`citations` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `skoot_conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skoot_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`consentedAt` bigint NOT NULL,
	`consentRevokedAt` bigint,
	`deletedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `skoot_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `skoot_conversation_messages` ADD CONSTRAINT `skoot_conversation_messages_conversationId_skoot_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `skoot_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_conversation_messages` ADD CONSTRAINT `skoot_conversation_messages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_conversations` ADD CONSTRAINT `skoot_conversations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `skoot_conversation_messages_owner_idx` ON `skoot_conversation_messages` (`userId`,`conversationId`);--> statement-breakpoint
CREATE INDEX `skoot_conversation_messages_created_idx` ON `skoot_conversation_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `skoot_conversations_user_updated_idx` ON `skoot_conversations` (`userId`,`updatedAt`);