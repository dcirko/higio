import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { databaseSchema } from '@/data/db/schema';

export const sqliteDatabase = openDatabaseSync('higio.db', {
  enableChangeListener: true,
});

sqliteDatabase.execSync('PRAGMA journal_mode = WAL;');
sqliteDatabase.execSync('PRAGMA foreign_keys = ON;');

export const database = drizzle(sqliteDatabase, {
  schema: databaseSchema,
});

export type HigioDatabase = typeof database;
