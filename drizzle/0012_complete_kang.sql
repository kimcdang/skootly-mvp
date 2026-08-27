CREATE TABLE `creator_pack_blueprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`versionId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`templateKind` enum('five_day_challenge','client_implementation') NOT NULL,
	`destination` text NOT NULL,
	`audience` text NOT NULL,
	`cadenceLabel` varchar(300) NOT NULL,
	`notToday` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_blueprints_id` PRIMARY KEY(`id`),
	CONSTRAINT `pack_blueprint_version_unique` UNIQUE(`packId`,`versionId`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`packVersionId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`inviteId` int,
	`status` enum('active','paused','completed','revoked') NOT NULL DEFAULT 'active',
	`currentMilestonePosition` int NOT NULL DEFAULT 1,
	`enrolledAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	`completedAt` bigint,
	CONSTRAINT `creator_pack_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `pack_enrollment_unique` UNIQUE(`packId`,`studentUserId`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_execution_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`packId` int NOT NULL,
	`packVersionId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`milestonePosition` int NOT NULL,
	`feedbackStatus` enum('done','stuck','not_today') NOT NULL,
	`detail` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_execution_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`packVersionId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`studentUserId` int,
	`expiresAt` bigint NOT NULL,
	`acceptedAt` bigint,
	`revokedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `pack_invite_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`versionId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`position` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`definitionOfDone` text NOT NULL,
	`defaultSkoot` text NOT NULL,
	`supportingSkoot` text,
	`feedbackPrompt` text NOT NULL,
	`resourceUrl` varchar(2048),
	`assetSpec` varchar(1000),
	`notToday` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_milestones_id` PRIMARY KEY(`id`),
	CONSTRAINT `pack_milestone_position_unique` UNIQUE(`packId`,`versionId`,`position`)
);
--> statement-breakpoint
ALTER TABLE `creator_pack_blueprints` ADD CONSTRAINT `creator_pack_blueprints_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_blueprints` ADD CONSTRAINT `creator_pack_blueprints_versionId_creator_pack_versions_id_fk` FOREIGN KEY (`versionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_blueprints` ADD CONSTRAINT `creator_pack_blueprints_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_enrollments` ADD CONSTRAINT `creator_pack_enrollments_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_enrollments` ADD CONSTRAINT `creator_pack_enrollments_packVersionId_creator_pack_versions_id_fk` FOREIGN KEY (`packVersionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_enrollments` ADD CONSTRAINT `creator_pack_enrollments_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_enrollments` ADD CONSTRAINT `creator_pack_enrollments_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_enrollments` ADD CONSTRAINT `creator_pack_enrollments_inviteId_creator_pack_invites_id_fk` FOREIGN KEY (`inviteId`) REFERENCES `creator_pack_invites`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_execution_feedback` ADD CONSTRAINT `creator_pack_execution_feedback_enrollmentId_creator_pack_enrollments_id_fk` FOREIGN KEY (`enrollmentId`) REFERENCES `creator_pack_enrollments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_execution_feedback` ADD CONSTRAINT `creator_pack_execution_feedback_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_execution_feedback` ADD CONSTRAINT `creator_pack_execution_feedback_packVersionId_creator_pack_versions_id_fk` FOREIGN KEY (`packVersionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_execution_feedback` ADD CONSTRAINT `creator_pack_execution_feedback_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_execution_feedback` ADD CONSTRAINT `creator_pack_execution_feedback_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_invites` ADD CONSTRAINT `creator_pack_invites_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_invites` ADD CONSTRAINT `creator_pack_invites_packVersionId_creator_pack_versions_id_fk` FOREIGN KEY (`packVersionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_invites` ADD CONSTRAINT `creator_pack_invites_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_invites` ADD CONSTRAINT `creator_pack_invites_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_milestones` ADD CONSTRAINT `creator_pack_milestones_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_milestones` ADD CONSTRAINT `creator_pack_milestones_versionId_creator_pack_versions_id_fk` FOREIGN KEY (`versionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_milestones` ADD CONSTRAINT `creator_pack_milestones_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pack_blueprint_creator_idx` ON `creator_pack_blueprints` (`creatorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pack_enrollment_student_idx` ON `creator_pack_enrollments` (`studentUserId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `pack_enrollment_creator_idx` ON `creator_pack_enrollments` (`creatorUserId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `pack_feedback_student_idx` ON `creator_pack_execution_feedback` (`studentUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pack_feedback_creator_idx` ON `creator_pack_execution_feedback` (`creatorUserId`,`feedbackStatus`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pack_invite_creator_idx` ON `creator_pack_invites` (`creatorUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pack_invite_email_idx` ON `creator_pack_invites` (`email`,`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `pack_milestone_version_idx` ON `creator_pack_milestones` (`versionId`,`position`);