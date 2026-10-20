CREATE TABLE `workshop_config_versions` (
	`revision` integer PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assessments` (
	`participant_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`initial` text NOT NULL,
	`initial_confidence` integer,
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
INSERT INTO `__new_assessments`("participant_id", "exercise_id", "initial", "initial_confidence", "initial_notes", "revised", "revised_confidence", "revised_notes", "updated_at") SELECT "participant_id", "exercise_id", "initial", "initial_confidence", "initial_notes", "revised", "revised_confidence", "revised_notes", "updated_at" FROM `assessments`;--> statement-breakpoint
DROP TABLE `assessments`;--> statement-breakpoint
ALTER TABLE `__new_assessments` RENAME TO `assessments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `assessments_exercise` ON `assessments` (`exercise_id`);