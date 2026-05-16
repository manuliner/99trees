CREATE TABLE `crew_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`turn_id` integer NOT NULL,
	`rating` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`turn_id`) REFERENCES `turns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `editions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`field_count` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`config_json` text DEFAULT '{}' NOT NULL,
	`crew_password_hash` text,
	`starts_at` integer,
	`ends_at` integer,
	`winner_team_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`edition_id` integer NOT NULL,
	`field_number` integer NOT NULL,
	`slug` text NOT NULL,
	`hint_vague` text NOT NULL,
	`hint_level_1` text NOT NULL,
	`hint_level_2` text NOT NULL,
	`map_x` integer NOT NULL,
	`map_y` integer NOT NULL,
	`qr_token` text NOT NULL,
	`task_type` text DEFAULT 'quiz' NOT NULL,
	`task_payload_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stations_edition_field` ON `stations` (`edition_id`,`field_number`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`edition_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`pin_hash` text NOT NULL,
	`team_qr_token` text NOT NULL,
	`position_confirmed` integer DEFAULT 0 NOT NULL,
	`score_total` integer DEFAULT 0 NOT NULL,
	`completed_fields_json` text DEFAULT '[]' NOT NULL,
	`session_token_hash` text,
	`reached_goal_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_edition_name` ON `teams` (`edition_id`,`name`);--> statement-breakpoint
CREATE TABLE `turns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`state` text NOT NULL,
	`dice_value` integer,
	`position_from` integer NOT NULL,
	`position_pending` integer NOT NULL,
	`hint_mode` text,
	`hints_used_json` text DEFAULT '[]' NOT NULL,
	`quiz_wrong_attempts` integer DEFAULT 0 NOT NULL,
	`bonus_points` integer DEFAULT 0 NOT NULL,
	`score_delta` integer,
	`station_id` integer,
	`rolled_at` integer,
	`scanned_at` integer,
	`completed_at` integer,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
