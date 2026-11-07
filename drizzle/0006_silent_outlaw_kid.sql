CREATE TABLE `covers` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roomMembers` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`owner` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roomPosts` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`owner` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `events` ADD `description` text;