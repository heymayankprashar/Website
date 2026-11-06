CREATE TABLE `invites` (
	`digest` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`expires` integer NOT NULL
);
