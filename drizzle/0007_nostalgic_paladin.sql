CREATE TABLE `creator_pack_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`assignedAt` bigint NOT NULL,
	`revokedAt` bigint,
	CONSTRAINT `creator_pack_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `creator_pack_assignment_unique` UNIQUE(`packId`,`studentUserId`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_attributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`studentUserId` int NOT NULL,
	`packId` int NOT NULL,
	`packVersionId` int NOT NULL,
	`knowledgeId` int,
	`recommendationId` int,
	`skootId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_attributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`versionId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`knowledgeType` enum('principle','framework','diagnostic_rule','decision_rule','milestone','skoot_action','script','not_today','example') NOT NULL,
	`content` text NOT NULL,
	`sourceText` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`sourceText` text NOT NULL,
	`proposedType` enum('principle','framework','diagnostic_rule','decision_rule','milestone','skoot_action','script','not_today','example') NOT NULL,
	`proposedContent` text NOT NULL,
	`status` enum('pending','approved','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` bigint NOT NULL,
	`resolvedAt` bigint,
	CONSTRAINT `creator_pack_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_pack_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packId` int NOT NULL,
	`creatorUserId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`changeSummary` text NOT NULL,
	`approvedAt` bigint NOT NULL,
	CONSTRAINT `creator_pack_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `creator_pack_versions_unique` UNIQUE(`packId`,`versionNumber`)
);
--> statement-breakpoint
CREATE TABLE `creator_skoot_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`name` varchar(300) NOT NULL,
	`description` text,
	`activeVersionId` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `creator_skoot_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creator_pack_assignments` ADD CONSTRAINT `creator_pack_assignments_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_assignments` ADD CONSTRAINT `creator_pack_assignments_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_assignments` ADD CONSTRAINT `creator_pack_assignments_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_studentUserId_users_id_fk` FOREIGN KEY (`studentUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_packVersionId_creator_pack_versions_id_fk` FOREIGN KEY (`packVersionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_knowledgeId_creator_pack_knowledge_id_fk` FOREIGN KEY (`knowledgeId`) REFERENCES `creator_pack_knowledge`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_recommendationId_recommendations_id_fk` FOREIGN KEY (`recommendationId`) REFERENCES `recommendations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_attributions` ADD CONSTRAINT `creator_pack_attributions_skootId_skoots_id_fk` FOREIGN KEY (`skootId`) REFERENCES `skoots`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_knowledge` ADD CONSTRAINT `creator_pack_knowledge_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_knowledge` ADD CONSTRAINT `creator_pack_knowledge_versionId_creator_pack_versions_id_fk` FOREIGN KEY (`versionId`) REFERENCES `creator_pack_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_knowledge` ADD CONSTRAINT `creator_pack_knowledge_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_proposals` ADD CONSTRAINT `creator_pack_proposals_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_proposals` ADD CONSTRAINT `creator_pack_proposals_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_versions` ADD CONSTRAINT `creator_pack_versions_packId_creator_skoot_packs_id_fk` FOREIGN KEY (`packId`) REFERENCES `creator_skoot_packs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_pack_versions` ADD CONSTRAINT `creator_pack_versions_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_skoot_packs` ADD CONSTRAINT `creator_skoot_packs_creatorUserId_users_id_fk` FOREIGN KEY (`creatorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creator_pack_assignments_student_idx` ON `creator_pack_assignments` (`studentUserId`,`revokedAt`);--> statement-breakpoint
CREATE INDEX `creator_pack_attr_student_idx` ON `creator_pack_attributions` (`studentUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `creator_pack_attr_creator_idx` ON `creator_pack_attributions` (`creatorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `creator_pack_knowledge_version_idx` ON `creator_pack_knowledge` (`versionId`,`knowledgeType`);--> statement-breakpoint
CREATE INDEX `creator_pack_proposals_owner_idx` ON `creator_pack_proposals` (`creatorUserId`,`status`);--> statement-breakpoint
CREATE INDEX `creator_pack_versions_owner_idx` ON `creator_pack_versions` (`creatorUserId`,`approvedAt`);--> statement-breakpoint
CREATE INDEX `creator_skoot_packs_owner_idx` ON `creator_skoot_packs` (`creatorUserId`,`updatedAt`);