CREATE TABLE `creator_pack_diagnostic_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`questionKey` varchar(255) NOT NULL,
	`questionText` text NOT NULL,
	`answer` text NOT NULL,
	`source` enum('student','inferred') NOT NULL DEFAULT 'student',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_diagnostic_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `pack_diag_answer_unique` UNIQUE(`packId`,`studentUserId`,`questionKey`)
);
--> statement-breakpoint
ALTER TABLE `creator_pack_diagnostic_answers` ADD CONSTRAINT `creator_pack_diagnostic_answers_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_diagnostic_answers` ADD CONSTRAINT `creator_pack_diagnostic_answers_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_diagnostic_answers` ADD CONSTRAINT `creator_pack_diagnostic_answers_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pack_diag_student_idx` ON `creator_pack_diagnostic_answers` (`studentUserId`,`packId`,`updatedAt`);