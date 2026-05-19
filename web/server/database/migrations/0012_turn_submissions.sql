CREATE TABLE `turn_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`turn_id` integer NOT NULL,
	`edition_id` integer NOT NULL,
	`kind` text NOT NULL,
	`mime_type` text NOT NULL,
	`original_filename` text,
	`file_size_bytes` integer NOT NULL,
	`duration_sec` integer,
	`stored_filename` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`turn_id`) REFERENCES `turns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `turn_submissions_turn_id_unique` ON `turn_submissions` (`turn_id`);
