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

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);

  CREATE INDEX IF NOT EXISTS credentials_user_id_idx ON credentials(user_id);

  CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    full_name TEXT,
    phone TEXT,
    occupation TEXT,
    english_level TEXT,
    interests TEXT,
    learning_goals TEXT,
    class_weekday TEXT,
    class_time TEXT,
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
    image_path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS vocab_cards_list_id_idx ON vocab_cards(list_id);

  CREATE TABLE IF NOT EXISTS vocab_list_students (
    list_id TEXT NOT NULL REFERENCES vocab_lists(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (list_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'embed' CHECK (kind IN ('embed', 'listening', 'quiz')),
    embed_src TEXT,
    embed_height INTEGER NOT NULL DEFAULT 500,
    youtube_video_id TEXT,
    questions TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_students (
    activity_id TEXT NOT NULL REFERENCES activities(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    PRIMARY KEY (activity_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS activity_answers (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    answers TEXT NOT NULL,
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    manual_grades TEXT,
    submitted_at TEXT NOT NULL,
    UNIQUE (activity_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS learning_topics (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    level TEXT,
    area TEXT CHECK (area IN ('grammar', 'vocabulary', 'communication')),
    exercise_url TEXT,
    video_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS learning_topic_completions (
    topic_id TEXT NOT NULL REFERENCES learning_topics(id),
    student_id TEXT NOT NULL REFERENCES users(id),
    completed_at TEXT NOT NULL,
    PRIMARY KEY (topic_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id),
    scheduled_at TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_link TEXT,
    activity_link TEXT,
    attended INTEGER,
    makeup_scheduled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS lessons_student_id_idx ON lessons(student_id);

  CREATE TABLE IF NOT EXISTS wordle_games (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    won INTEGER NOT NULL,
    guesses_used INTEGER NOT NULL,
    hint_used INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (student_id, date)
  );

  CREATE INDEX IF NOT EXISTS wordle_games_date_idx ON wordle_games(date);

  CREATE TABLE IF NOT EXISTS wordle_guesses (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    guess_index INTEGER NOT NULL,
    word TEXT NOT NULL,
    statuses TEXT NOT NULL,
    phonetic TEXT,
    audio_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS wordle_guesses_student_date_idx ON wordle_guesses(student_id, date);

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Colunas adicionadas depois que a tabela já existia em produção — CREATE TABLE
// IF NOT EXISTS não altera tabelas existentes, então precisam ser aplicadas à parte.
try {
  sqlite.exec(`ALTER TABLE vocab_cards ADD COLUMN image_path TEXT`);
} catch {
  // já existe
}

try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN class_weekday TEXT`);
} catch {
  // já existe
}
try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN birth_date TEXT`);
} catch {
  // já existe
}
try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN class_time TEXT`);
} catch {
  // já existe
}
try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN installment_value TEXT`);
} catch {
  // já existe
}
try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN payment_due_day TEXT`);
} catch {
  // já existe
}
try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN contract_start TEXT`);
} catch {
  // já existe
}
try {
  sqlite.exec(`ALTER TABLE student_profiles ADD COLUMN contract_end TEXT`);
} catch {
  // já existe
}

try {
  sqlite.exec(`ALTER TABLE activity_answers ADD COLUMN manual_grades TEXT`);
} catch {
  // já existe
}

try {
  sqlite.exec(`ALTER TABLE lessons ADD COLUMN makeup_scheduled INTEGER NOT NULL DEFAULT 0`);
} catch {
  // já existe
}

try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN new_content_seen_at TEXT`);
} catch {
  // já existe
}

// activities: a tabela já existia em produção com CHECK mais restritivo (sem
// "listening" antes, sem "quiz" agora) — SQLite não permite alterar CHECK com
// ALTER TABLE, então reconstruímos a tabela (idempotente: só roda se o CHECK
// salvo ainda não incluir o valor mais novo).
const activitiesTable = sqlite
  .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'activities'`)
  .get() as { sql: string } | undefined;
if (activitiesTable && !activitiesTable.sql.includes("quiz")) {
  sqlite.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE activities_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'embed' CHECK (kind IN ('embed', 'listening', 'quiz')),
      embed_src TEXT,
      embed_height INTEGER NOT NULL DEFAULT 500,
      youtube_video_id TEXT,
      questions TEXT,
      created_at TEXT NOT NULL
    );
    INSERT INTO activities_new (id, title, kind, embed_src, embed_height, youtube_video_id, questions, created_at)
      SELECT id, title, kind, embed_src, embed_height, youtube_video_id, questions, created_at FROM activities;
    DROP TABLE activities;
    ALTER TABLE activities_new RENAME TO activities;
    PRAGMA foreign_keys = ON;
  `);
}

export const db = drizzle(sqlite, { schema });
export { schema };
