CREATE TABLE `assessments` (
	`participant_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`initial` text NOT NULL,
	`initial_confidence` integer NOT NULL,
	`initial_notes` text NOT NULL,
	`revised` text,
	`revised_confidence` integer,
	`revised_notes` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`participant_id`, `exercise_id`),
	FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assessments_exercise` ON `assessments` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`kind` text NOT NULL,
	`media_id` text,
	`tools` text NOT NULL,
	`truth` text NOT NULL,
	`explanation` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`revealed` integer DEFAULT 0 NOT NULL,
	`placeholder` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exercises_published` ON `exercises` (`published`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `detector_results` (
	`exercise_id` text NOT NULL,
	`model` text NOT NULL,
	`result` text NOT NULL,
	PRIMARY KEY(`exercise_id`, `model`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
