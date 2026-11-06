CREATE TABLE `accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`principal` text NOT NULL,
	`username` text NOT NULL,
	`salt` text NOT NULL,
	`passwordHash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_principal_unique` ON `accounts` (`principal`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username_unique` ON `accounts` (`username`);