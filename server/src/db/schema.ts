import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null até o primeiro login (senha ainda não definida)
  role: text("role", { enum: ["teacher", "student"] }).notNull(),
  createdAt: text("created_at").notNull(),
  newContentSeenAt: text("new_content_seen_at"), // último momento em que o aluno viu o aviso de novidades na tela inicial
});

export const studentProfiles = sqliteTable("student_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id),
  fullName: text("full_name"),
  birthDate: text("birth_date"), // data de nascimento, "YYYY-MM-DD"
  phone: text("phone"),
  occupation: text("occupation"), // emprego/profissão
  englishLevel: text("english_level"), // nível atual de inglês
  interests: text("interests"), // o que gosta de aprender / assuntos de interesse
  learningGoals: text("learning_goals"), // metas de estudo
  classWeekday: text("class_weekday"), // dia da semana da aula fixa (ex.: "tuesday")
  classTime: text("class_time"), // horário da aula fixa, "HH:MM"
  installmentValue: text("installment_value"), // valor da parcela mensal (texto livre, ex.: "R$ 280,00")
  paymentDueDay: text("payment_due_day"), // dia do mês do vencimento (ex.: "10")
  contractStart: text("contract_start"), // início do contrato, "YYYY-MM-DD"
  contractEnd: text("contract_end"), // fim do contrato, "YYYY-MM-DD" — null se em andamento
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
  imagePath: text("image_path"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const vocabListStudents = sqliteTable("vocab_list_students", {
  listId: text("list_id").notNull().references(() => vocabLists.id),
  studentId: text("student_id").notNull().references(() => users.id),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind", { enum: ["embed", "listening", "quiz"] }).notNull().default("embed"),
  embedSrc: text("embed_src"),
  embedHeight: integer("embed_height").notNull().default(500),
  youtubeVideoId: text("youtube_video_id"),
  // JSON. kind "listening": { prompt, options[], correctIndex }[].
  // kind "quiz" (feita pela professora, sem vídeo): { type: "choice", prompt, options[], correctIndex }[] |
  // { type: "blank", prompt }[] — a professora mistura os dois tipos livremente.
  questions: text("questions"),
  createdAt: text("created_at").notNull(),
});

export const activityStudents = sqliteTable("activity_students", {
  activityId: text("activity_id").notNull().references(() => activities.id),
  studentId: text("student_id").notNull().references(() => users.id),
});

export const activityAnswers = sqliteTable("activity_answers", {
  id: text("id").primaryKey(),
  activityId: text("activity_id").notNull().references(() => activities.id),
  studentId: text("student_id").notNull().references(() => users.id),
  // JSON: (number | string)[] na ordem das perguntas — número pro índice escolhido
  // (choice/listening), texto pra resposta escrita (quiz "blank").
  answers: text("answers").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  // JSON: Record<string, boolean> — nota manual da professora por índice de pergunta
  // "blank" (essas não são corrigidas automaticamente). Null até ela corrigir alguma.
  manualGrades: text("manual_grades"),
  submittedAt: text("submitted_at").notNull(),
});

// Trilha de aprendizagem: uma lista única de tópicos (gramática, vocabulário,
// comunicação) que vale pra todos os alunos, na mesma ordem. O progresso de quem
// já estudou cada tópico é individual — ver learningTopicCompletions.
export const learningTopics = sqliteTable("learning_topics", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  level: text("level"), // ex.: "A1" ou "B2, C1" (mais de um nível)
  area: text("area", { enum: ["grammar", "vocabulary", "communication"] }),
  exerciseUrl: text("exercise_url"),
  videoUrl: text("video_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const learningTopicCompletions = sqliteTable("learning_topic_completions", {
  topicId: text("topic_id").notNull().references(() => learningTopics.id),
  studentId: text("student_id").notNull().references(() => users.id),
  completedAt: text("completed_at").notNull(),
});

export const lessons = sqliteTable("lessons", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id),
  scheduledAt: text("scheduled_at").notNull(), // data + horário da aula, ISO datetime
  subject: text("subject").notNull(), // assunto da aula
  classLink: text("class_link"), // link da videochamada
  activityLink: text("activity_link"), // link da atividade/exercício
  attended: integer("attended", { mode: "boolean" }), // null = aula ainda não ocorreu
  makeupScheduled: integer("makeup_scheduled", { mode: "boolean" }).notNull().default(false), // reposição já marcada pra essa falta
  createdAt: text("created_at").notNull(),
});

// Configurações que a professora cadastra pelo próprio site (ex.: chave da API de IA).
// Guardadas só aqui — nunca devolvidas pelo servidor depois de salvas, só "está configurada?".
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const wordleGames = sqliteTable("wordle_games", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id),
  date: text("date").notNull(), // "YYYY-MM-DD"
  won: integer("won", { mode: "boolean" }).notNull(),
  guessesUsed: integer("guesses_used").notNull(),
  hintUsed: integer("hint_used", { mode: "boolean" }).notNull().default(false),
  points: integer("points").notNull(),
  createdAt: text("created_at").notNull(),
});

// Cada tentativa (linha) que o aluno digitou no jogo do dia — guardado pra ele
// poder revisitar a tentativa de hoje depois (com fonética/áudio da palavra).
export const wordleGuesses = sqliteTable("wordle_guesses", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => users.id),
  date: text("date").notNull(), // "YYYY-MM-DD"
  guessIndex: integer("guess_index").notNull(), // 0-based, ordem da tentativa no dia
  word: text("word").notNull(),
  statuses: text("statuses").notNull(), // JSON: ("correct" | "present" | "absent")[]
  phonetic: text("phonetic"),
  audioUrl: text("audio_url"),
  createdAt: text("created_at").notNull(),
});

// Fórum: publicações curtas (texto + link opcional) que toda a turma vê.
// As da professora já saem publicadas; as dos alunos ficam aguardando aprovação
// (publishedAt null) até a professora aprovar.
export const forumPosts = sqliteTable("forum_posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  publishedAt: text("published_at"), // null = aguardando aprovação da professora
  createdAt: text("created_at").notNull(),
});

// Comentários aparecem na hora, sem aprovação — a professora pode apagar qualquer um.
export const forumComments = sqliteTable("forum_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => forumPosts.id),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  // hash (sha-256) do token — o token em si só existe no link, nunca é salvo em texto puro
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
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
