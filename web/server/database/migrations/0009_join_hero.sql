ALTER TABLE `editions` ADD `join_description_json` text DEFAULT '{"de":"","en":""}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `editions` ADD `join_logo_path` text;
