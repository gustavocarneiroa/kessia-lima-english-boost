// "Meu perfil de aprendizagem" — ids iguais aos de server/src/lib/learningProfile.ts.
type L = [pt: string, en: string];

export const GOAL_LABELS: Record<string, L> = {
  work: ["Trabalho (reuniões, entrevistas, clientes de fora)", "Work (meetings, interviews, international clients)"],
  job_abroad: ["Conseguir emprego ou vaga no exterior", "Get a job or position abroad"],
  travel: ["Viagens", "Travel"],
  live_abroad: ["Morar fora / intercâmbio", "Live abroad / exchange program"],
  studies: ["Estudos (faculdade, certificações, IELTS/TOEFL)", "Studies (college, certifications, IELTS/TOEFL)"],
  entertainment: ["Entender séries, filmes, músicas e jogos sem legenda", "Understand series, movies, music and games without subtitles"],
  confidence: ["Ter confiança pra falar com qualquer pessoa", "Feel confident speaking to anyone"],
};

export const DIFFICULTY_LABELS: Record<string, L> = {
  speaking_fluency: ["Falar sem travar ou sem traduzir na cabeça", "Speaking without freezing or translating in my head"],
  fast_speech: ["Entender quem fala rápido ou com sotaque", "Understanding fast speech or accents"],
  meetings: ["Reuniões e chamadas de vídeo", "Meetings and video calls"],
  writing_work: ["Escrever e-mails e mensagens de trabalho", "Writing work emails and messages"],
  reading_technical: ["Ler textos técnicos e documentação", "Reading technical texts and documentation"],
  vocabulary: ["Vocabulário — me faltam palavras", "Vocabulary — I run out of words"],
  grammar: ["Gramática — tenho medo de errar", "Grammar — I'm afraid of making mistakes"],
  pronunciation: ["Pronúncia", "Pronunciation"],
};

export const SELF_SKILL_LABELS: Record<string, L> = {
  speaking: ["Fala (speaking)", "Speaking"],
  listening: ["Compreensão oral (listening)", "Listening"],
  reading: ["Leitura (reading)", "Reading"],
  writing: ["Escrita (writing)", "Writing"],
};
export const SELF_SKILLS = Object.keys(SELF_SKILL_LABELS) as ("speaking" | "listening" | "reading" | "writing")[];

export const RATING_LABELS: Record<number, L> = {
  1: ["Muito fraco", "Very weak"],
  2: ["Fraco", "Weak"],
  3: ["Médio", "Average"],
  4: ["Bom", "Good"],
  5: ["Muito bom", "Very good"],
};

export const USAGE_LABELS: Record<string, L> = {
  never: ["Nunca", "Never"],
  yearly: ["Algumas vezes por ano", "A few times a year"],
  monthly: ["Todo mês", "Every month"],
  weekly: ["Toda semana", "Every week"],
  daily: ["Todo dia", "Every day"],
};

export const TOPIC_LABELS: Record<string, L> = {
  tech: ["Tecnologia", "Technology"],
  business: ["Negócios", "Business"],
  travel: ["Viagens", "Travel"],
  series: ["Séries e filmes", "Series and movies"],
  music: ["Música", "Music"],
  games: ["Games", "Games"],
  sports: ["Esportes", "Sports"],
  food: ["Comida", "Food"],
  health: ["Saúde e bem-estar", "Health and well-being"],
  science: ["Ciência", "Science"],
  news: ["Atualidades", "Current events"],
  culture: ["Cultura e arte", "Culture and art"],
};

export const STYLE_LABELS: Record<string, L> = {
  conversation: ["Conversação livre", "Free conversation"],
  videos: ["Vídeos e listening", "Videos and listening"],
  grammar_exercises: ["Exercícios de gramática", "Grammar exercises"],
  reading: ["Leitura", "Reading"],
  games: ["Jogos", "Games"],
  homework: ["Homework pra fazer em casa", "Homework to do at home"],
};

export const CORRECTION_LABELS: Record<string, L> = {
  immediate: ["Na hora, quando eu erro", "Right away, when I make a mistake"],
  end: ["Só no fim, pra não me interromper", "Only at the end, so I'm not interrupted"],
  no_preference: ["Tanto faz", "No preference"],
};

export interface LearningProfileAnswers {
  goals: string[];
  goalsOther?: string | null;
  difficulties: string[];
  difficultiesOther?: string | null;
  selfRating: Partial<Record<"speaking" | "listening" | "reading" | "writing", number | null>>;
  usageWork?: string | null;
  usageOutside?: string | null;
  topics: string[];
  topicsOther?: string | null;
  styles: string[];
  correction?: string | null;
  message?: string | null;
}

export interface LearningProfileResponse {
  answers: LearningProfileAnswers | null;
  updatedAt: string | null;
}

export const emptyAnswers = (): LearningProfileAnswers => ({
  goals: [],
  goalsOther: "",
  difficulties: [],
  difficultiesOther: "",
  selfRating: {},
  usageWork: null,
  usageOutside: null,
  topics: [],
  topicsOther: "",
  styles: [],
  correction: null,
  message: "",
});
