CREATE TABLE `tool_manual_versions` (
	`tool` text NOT NULL,
	`revision` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tool`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `workshop_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`applied_at` text NOT NULL
);
