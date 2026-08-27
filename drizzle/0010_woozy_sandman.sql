CREATE TABLE `identifiable_content_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`scope` enum('name','result','recording','screenshot','business_info') NOT NULL,
	`purpose` varchar(1000) NOT NULL,
	`consentedAt` bigint NOT NULL,
	`revokedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `identifiable_content_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `ident_content_consent_unique` UNIQUE(`creatorUserId`,`studentUserId`,`scope`)
);
--> statement-breakpoint
CREATE TABLE `support_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`escalationId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`body` text NOT NULL,
	`deepLink` varchar(1000) NOT NULL,
	`readAt` bigint,
	`dismissedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `support_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `identifiable_content_consents` ADD CONSTRAINT `identifiable_content_consents_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `identifiable_content_consents` ADD CONSTRAINT `identifiable_content_consents_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_notifications` ADD CONSTRAINT `support_notifications_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_notifications` ADD CONSTRAINT `support_notifications_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_notifications` ADD CONSTRAINT `support_notifications_escalationId_smart_escalations_id_fk` FOREIGN KEY (`escalationId`) REFERENCES `smart_escalations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ident_content_student_idx` ON `identifiable_content_consents` (`studentUserId`,`revokedAt`);--> statement-breakpoint
CREATE INDEX `support_notif_recipient_idx` ON `support_notifications` (`recipientUserId`,`dismissedAt`,`createdAt`);