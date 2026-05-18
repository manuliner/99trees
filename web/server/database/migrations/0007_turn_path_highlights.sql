ALTER TABLE `turns` ADD COLUMN `path_played_fields_json` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `turns` ADD COLUMN `path_overflow_fields_json` text DEFAULT '[]' NOT NULL;
