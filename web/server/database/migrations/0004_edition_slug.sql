ALTER TABLE `editions` ADD `slug` text;
--> statement-breakpoint
UPDATE `editions` SET `slug` = 'edition-' || `id` WHERE `slug` IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `editions_slug_unique` ON `editions` (`slug`);
