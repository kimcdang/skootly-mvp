CREATE TABLE `highlevel_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`locationId` varchar(96) NOT NULL,
	`companyId` varchar(96),
	`highLevelUserId` varchar(96),
	`locationName` varchar(240),
	`userType` enum('Location','Company') NOT NULL,
	`encryptedAccessToken` text NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`accessTokenExpiresAt` bigint NOT NULL,
	`refreshTokenExpiresAt` bigint NOT NULL,
	`scopes` text NOT NULL,
	`selected` boolean NOT NULL DEFAULT false,
	`status` enum('active','expired','error','disconnected') NOT NULL DEFAULT 'active',
	`lastSyncAt` bigint,
	`lastSyncError` varchar(500),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `highlevel_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `highlevel_connections_user_location_idx` UNIQUE(`userId`,`locationId`)
);
--> statement-breakpoint
CREATE TABLE `highlevel_oauth_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`returnPath` varchar(240) NOT NULL DEFAULT '/founder',
	`expiresAt` bigint NOT NULL,
	`usedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `highlevel_oauth_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `highlevel_oauth_states_stateHash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
ALTER TABLE `highlevel_connections` ADD CONSTRAINT `highlevel_connections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `highlevel_oauth_states` ADD CONSTRAINT `highlevel_oauth_states_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `highlevel_connections_user_selected_idx` ON `highlevel_connections` (`userId`,`selected`);--> statement-breakpoint
CREATE INDEX `highlevel_oauth_states_user_expires_idx` ON `highlevel_oauth_states` (`userId`,`expiresAt`);