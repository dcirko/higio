CREATE TABLE `activity_state_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`status` text NOT NULL,
	`valid_from_local_date` text NOT NULL,
	`valid_to_local_date` text,
	`created_at_utc` integer NOT NULL,
	`updated_at_utc` integer NOT NULL,
	`deleted_at_utc` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_state_versions_activity_validity_idx` ON `activity_state_versions` (`activity_id`,`valid_from_local_date`,`valid_to_local_date`);--> statement-breakpoint
ALTER TABLE `activities` ADD `description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `status` text DEFAULT 'active' NOT NULL;