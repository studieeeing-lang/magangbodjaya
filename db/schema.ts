import { pgTable, text, jsonb } from 'drizzle-orm/pg-core';

export const documents = pgTable('tracker_documents', {
  path: text('path').primaryKey(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),
});
