CREATE TABLE `creator_workspace_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviterUserId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`acceptedUserId` int,
	`expiresAt` bigint NOT NULL,
	`acceptedAt` bigint,
	`revokedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_workspace_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `creator_invite_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `creator_workspace_invites` ADD CONSTRAINT `creator_workspace_invites_inviterUserId_users_id_fk` FOREIGN KEY (`inviterUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_workspace_invites` ADD CONSTRAINT `creator_workspace_invites_acceptedUserId_users_id_fk` FOREIGN KEY (`acceptedUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creator_invite_owner_idx` ON `creator_workspace_invites` (`inviterUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `creator_invite_email_idx` ON `creator_workspace_invites` (`email`,`status`,`expiresAt`);