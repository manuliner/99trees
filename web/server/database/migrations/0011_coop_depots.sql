CREATE TABLE `coop_depots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`edition_id` integer NOT NULL,
	`field_number` integer NOT NULL,
	`task_id` integer NOT NULL,
	`initiator_team_id` integer NOT NULL,
	`partner_team_id` integer,
	`initiator_turn_id` integer NOT NULL,
	`partner_turn_id` integer,
	`state` text NOT NULL,
	`initiator_bonus_paid` integer DEFAULT 0 NOT NULL,
	`partner_bonus_paid` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`initiator_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`initiator_turn_id`) REFERENCES `turns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_turn_id`) REFERENCES `turns`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coop_depots_edition_field_awaiting` ON `coop_depots` (`edition_id`,`field_number`) WHERE `state` = 'awaiting_partner';
