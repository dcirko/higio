CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_pinned` integer DEFAULT false NOT NULL,
	`created_at_utc` integer NOT NULL,
	`updated_at_utc` integer NOT NULL,
	`deleted_at_utc` integer
);
--> statement-breakpoint
CREATE INDEX `activities_active_sort_idx` ON `activities` (`deleted_at_utc`,`sort_order`);--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`schedule_version_id` text,
	`slot_id` text,
	`occurrence_key` text,
	`planned_local_date` text,
	`occurred_at_utc` integer NOT NULL,
	`local_date` text NOT NULL,
	`local_time` text NOT NULL,
	`timezone` text NOT NULL,
	`utc_offset_minutes` integer NOT NULL,
	`created_at_utc` integer NOT NULL,
	`updated_at_utc` integer NOT NULL,
	`deleted_at_utc` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_version_id`) REFERENCES `schedule_versions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`slot_id`) REFERENCES `schedule_slots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_logs_occurrence_key_uidx` ON `activity_logs` (`occurrence_key`);--> statement-breakpoint
CREATE INDEX `activity_logs_activity_time_idx` ON `activity_logs` (`activity_id`,`occurred_at_utc`);--> statement-breakpoint
CREATE INDEX `activity_logs_local_date_idx` ON `activity_logs` (`local_date`,`deleted_at_utc`);--> statement-breakpoint
CREATE TABLE `schedule_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_version_id` text NOT NULL,
	`label` text NOT NULL,
	`day_part` text NOT NULL,
	`preferred_minutes` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at_utc` integer NOT NULL,
	`updated_at_utc` integer NOT NULL,
	`deleted_at_utc` integer,
	FOREIGN KEY (`schedule_version_id`) REFERENCES `schedule_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_slots_schedule_sort_idx` ON `schedule_slots` (`schedule_version_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `schedule_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`type` text NOT NULL,
	`timezone` text NOT NULL,
	`valid_from_local_date` text NOT NULL,
	`valid_to_local_date` text,
	`interval_every` integer,
	`interval_unit` text,
	`first_due_local_date` text,
	`created_at_utc` integer NOT NULL,
	`updated_at_utc` integer NOT NULL,
	`deleted_at_utc` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_versions_activity_validity_idx` ON `schedule_versions` (`activity_id`,`valid_from_local_date`,`valid_to_local_date`);--> statement-breakpoint
CREATE TABLE `schedule_weekdays` (
	`schedule_version_id` text NOT NULL,
	`iso_weekday` integer NOT NULL,
	PRIMARY KEY(`schedule_version_id`, `iso_weekday`),
	FOREIGN KEY (`schedule_version_id`) REFERENCES `schedule_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at_utc` integer NOT NULL
);
