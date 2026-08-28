CREATE TABLE `mcp_access_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(2048) NOT NULL,
	`clientName` varchar(300) NOT NULL,
	`scopes` varchar(500) NOT NULL,
	`resource` varchar(2048) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`revokedAt` bigint,
	`lastUsedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `mcp_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `mcp_access_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `mcp_authorization_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(2048) NOT NULL,
	`clientName` varchar(300) NOT NULL,
	`redirectUri` varchar(2048) NOT NULL,
	`scopes` varchar(500) NOT NULL,
	`resource` varchar(2048) NOT NULL,
	`codeChallenge` varchar(256) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`usedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `mcp_authorization_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `mcp_auth_code_hash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
ALTER TABLE `mcp_access_tokens` ADD CONSTRAINT `mcp_access_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mcp_authorization_codes` ADD CONSTRAINT `mcp_authorization_codes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mcp_access_token_user_idx` ON `mcp_access_tokens` (`userId`,`revokedAt`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `mcp_auth_code_user_expiry` ON `mcp_authorization_codes` (`userId`,`expiresAt`);