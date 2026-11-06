CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`listing` text NOT NULL,
	`buyer` text NOT NULL,
	`seller` text NOT NULL,
	`author` text NOT NULL,
	`price` integer NOT NULL,
	`state` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`wallet` text,
	`finished` integer,
	`issue` text
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`event` text NOT NULL,
	`tier` text NOT NULL,
	`deadline` integer NOT NULL,
	`side` text NOT NULL,
	`price` integer NOT NULL,
	`state` text DEFAULT 'open' NOT NULL
);
