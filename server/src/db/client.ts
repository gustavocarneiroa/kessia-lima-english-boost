import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../env.ts";
import * as schema from "./schema.ts";

mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });

export const sqlite = new Database(env.DATABASE_PATH);

// Um único processo escreve — WAL + busy_timeout evitam contenção de lock.
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("synchronous = NORMAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");

// Schema simples o suficiente pra não precisar de um migrator versionado ainda —
// CREATE TABLE IF NOT EXISTS é idempotente e roda a cada boot.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS credentials_user_id_idx ON credentials(user_id);

  CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    full_name TEXT,
    phone TEXT,
    occupation TEXT,
    english_level TEXT,
    interests TEXT,
    learning_goals TEXT,
    schedule_preference TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vocab_lists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vocab_cards (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES vocab_lists(id),
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    phonetic TEXT NOT NULL,
    source_url TEXT,
    origin TEXT NOT NULL CHECK (origin IN ('api', 'teacher')),
    word_audio_path TEXT,
    meaning_audio_path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS vocab_cards_list_id_idx ON vocab_cards(list_id);

  CREATE TABLE IF NOT EXISTS vocab_list_students (
    list_id TEXT NOT NULL REFERENCES vocab_lists(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (list_id, student_id)
  );
`);

export const db = drizzle(sqlite, { schema });
export { schema };
