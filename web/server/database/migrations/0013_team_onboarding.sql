ALTER TABLE `teams` ADD `avatar_id` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `motto` text;--> statement-breakpoint
ALTER TABLE `teams` ADD `onboarding_completed_at` integer;--> statement-breakpoint
UPDATE `teams` SET `onboarding_completed_at` = `created_at` WHERE `onboarding_completed_at` IS NULL;
