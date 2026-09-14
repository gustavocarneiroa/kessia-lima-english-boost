import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null até o primeiro login (senha ainda não definida)
  role: text("role", { enum: ["teacher", "student"] }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const studentProfiles = sqliteTable("student_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  fullName: text("full_name"),
  phone: text("phone"),
  occupation: text("occupation"), // emprego/profissão
  englishLevel: text("english_level"), // nível atual de inglês
  interests: text("interests"), // o que gosta de aprender / assuntos de interesse
  learningGoals: text("learning_goals"), // metas de estudo
  schedulePreference: text("schedule_preference"), // cronograma/horários preferidos
  notes: text("notes"), // observações gerais
  updatedAt: text("updated_at").notNull(),
});

export const vocabLists = sqliteTable("vocab_lists", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
});

export const vocabCards = sqliteTable("vocab_cards", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => vocabLists.id),
  word: text("word").notNull(),
  meaning: text("meaning").notNull(),
  phonetic: text("phonetic").notNull(),
  sourceUrl: text("source_url"),
  origin: text("origin", { enum: ["api", "teacher"] }).notNull(),
  wordAudioPath: text("word_audio_path"),
  meaningAudioPath: text("meaning_audio_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const vocabListStudents = sqliteTable("vocab_list_students", {
  listId: text("list_id").notNull().references(() => vocabLists.id),
  studentId: text("student_id").notNull().references(() => users.id),
});

export const credentials = sqliteTable("credentials", {
  // credential ID do WebAuthn (base64url), gerado pelo autenticador/dispositivo
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  publicKey: text("public_key").notNull(), // base64url
  counter: integer("counter").notNull().default(0),
  deviceName: text("device_name"),
  createdAt: text("created_at").notNull(),
});
