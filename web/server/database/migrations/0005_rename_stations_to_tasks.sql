ALTER TABLE `stations` RENAME TO `tasks`;
--> statement-breakpoint
ALTER TABLE `tasks` RENAME COLUMN `task_type` TO `activity_type`;
--> statement-breakpoint
ALTER TABLE `tasks` RENAME COLUMN `task_payload_json` TO `activity_payload_json`;
--> statement-breakpoint
ALTER TABLE `turns` RENAME COLUMN `station_id` TO `task_id`;
