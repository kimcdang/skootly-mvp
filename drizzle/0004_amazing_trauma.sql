CREATE TABLE `group_contexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('skool','other') NOT NULL,
	`name` varchar(300) NOT NULL,
	`groupUrl` varchar(2048) NOT NULL,
	`settingsUrl` varchar(2048),
	`settingsLabel` varchar(160),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `group_contexts_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_contexts_user_url_idx` UNIQUE(`userId`,`groupUrl`)
);
--> statement-breakpoint
CREATE TABLE `skoot_pack_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`packId` int NOT NULL,
	`position` int NOT NULL,
	`actionType` enum('asset_preparation','platform_setup','homework','engagement') NOT NULL,
	`actionTitle` text NOT NULL,
	`rationale` text NOT NULL,
	`assetDeliverable` varchar(300),
	`assetWidth` int,
	`assetHeight` int,
	`assetFormatHints` text,
	`requiresConfirmation` boolean NOT NULL DEFAULT false,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `skoot_pack_steps_id` PRIMARY KEY(`id`),
	CONSTRAINT `skoot_pack_steps_position_idx` UNIQUE(`packId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `skoot_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`title` varchar(300) NOT NULL,
	`triggerPhrases` text NOT NULL,
	`goal` text NOT NULL,
	`notes` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `skoot_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `group_contexts` ADD CONSTRAINT `group_contexts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_pack_steps` ADD CONSTRAINT `skoot_pack_steps_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_pack_steps` ADD CONSTRAINT `skoot_pack_steps_packId_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_packs` ADD CONSTRAINT `skoot_packs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skoot_packs` ADD CONSTRAINT `skoot_packs_groupId_group_contexts_id_fk` FOREIGN KEY (`groupId`) REFERENCES `group_contexts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `group_contexts_user_idx` ON `group_contexts` (`userId`);--> statement-breakpoint
CREATE INDEX `skoot_pack_steps_user_idx` ON `skoot_pack_steps` (`userId`,`packId`);--> statement-breakpoint
CREATE INDEX `skoot_packs_user_enabled_idx` ON `skoot_packs` (`userId`,`enabled`);--> statement-breakpoint
CREATE INDEX `skoot_packs_group_idx` ON `skoot_packs` (`groupId`);