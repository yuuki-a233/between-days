import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const posts = sqliteTable('posts', {
 id:text('id').primaryKey(), ownerId:text('owner_id').notNull(), kind:text('kind').notNull(), category:text('category').notNull(), title:text('title').notNull(), body:text('body').notNull(), cover:text('cover').notNull().default(''), attachment:text('attachment').notNull().default(''), attachmentName:text('attachment_name').notNull().default(''), createdAt:text('created_at').notNull(), link:text('link').notNull().default(''),
});
