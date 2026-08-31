CREATE TABLE `coach_onboardings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`selectedRole` enum('coach','student') NOT NULL,
	`stage` enum('role','profile','method','review','launch','complete') NOT NULL DEFAULT 'role',
	`displayName` varchar(300),
	`avatarUrl` varchar(2048),
	`offer` text,
	`audience` text,
	`templateKind` enum('five_day_challenge','client_implementation'),
	`methodSourceKind` enum('notes','file','template'),
	`methodNotes` text,
	`sourceFileName` varchar(500),
	`packId` int,
	`completedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `coach_onboardings_id` PRIMARY KEY(`id`),
	CONSTRAINT `coach_onboarding_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `coach_onboardings` ADD CONSTRAINT `coach_onboardings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coach_onboardings` ADD CONSTRAINT `coach_onboardings_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coach_onboarding_stage_idx` ON `coach_onboardings` (`userId`,`stage`);