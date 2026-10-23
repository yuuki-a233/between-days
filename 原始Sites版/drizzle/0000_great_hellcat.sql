CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`cover` text DEFAULT '' NOT NULL,
	`attachment` text DEFAULT '' NOT NULL,
	`attachment_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
