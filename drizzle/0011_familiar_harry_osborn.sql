CREATE TABLE `user_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_credentials_user_id_uq` UNIQUE(`userId`),
	CONSTRAINT `user_credentials_email_uq` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `user_credentials` ADD CONSTRAINT `user_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;