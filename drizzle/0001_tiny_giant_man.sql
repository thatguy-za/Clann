PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_people` (
	`id` text PRIMARY KEY NOT NULL,
	`given_name` text NOT NULL,
	`family_name` text,
	`sex` text,
	`birth_date` text,
	`death_date` text,
	`occupation` text,
	`bio` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_people`("id", "given_name", "family_name", "sex", "birth_date", "death_date", "occupation", "bio", "created_at", "updated_at") SELECT "id", "given_name", "family_name", "sex", "birth_date", "death_date", "occupation", "bio", "created_at", "updated_at" FROM `people`;--> statement-breakpoint
DROP TABLE `people`;--> statement-breakpoint
ALTER TABLE `__new_people` RENAME TO `people`;--> statement-breakpoint
PRAGMA foreign_keys=ON;