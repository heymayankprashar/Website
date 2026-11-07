CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`body` text NOT NULL,
	`path` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start` integer NOT NULL,
	`venue` text,
	`tiers` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pushDevices` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pushKeys` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`publicKey` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`eventId` text NOT NULL,
	`tier` text NOT NULL,
	`price` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `deals` ADD `cancelBy` text;--> statement-breakpoint
ALTER TABLE `deals` ADD `paid` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `deals` ADD `matched` integer;--> statement-breakpoint
ALTER TABLE `listings` ADD `eventId` text;