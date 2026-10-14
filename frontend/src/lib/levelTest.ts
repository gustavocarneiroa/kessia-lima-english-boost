// Teste de nível (escala CEFR). As regras de correção ficam no servidor
// (server/src/lib/levelTest.ts) — aqui só os tipos e os textos de cada nível.

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Enquanto false, só a professora vê o teste (menu, aviso e "Liberar" escondidos pro aluno).
 * Mudar junto com o mesmo nome em server/src/lib/levelTest.ts. */
export const LEVEL_TEST_FOR_STUDENTS = false;

/** Resposta "não sei". */
export const DONT_KNOW = -1;

export const LEVEL_INFO: Record<CefrLevel, { name: [pt: string, en: string]; description: [pt: string, en: string] }> = {
  A1: {
    name: ["Iniciante", "Beginner"],
    description: [
      "Entende e usa frases do dia a dia bem simples: se apresentar, falar de onde é, pedir coisas básicas.",
      "Understands and uses very simple everyday phrases: introducing yourself, saying where you're from, asking for basic things.",
    ],
  },
  A2: {
    name: ["Básico", "Elementary"],
    description: [
      "Conversa sobre assuntos do cotidiano (família, compras, trabalho) e fala sobre o passado de forma simples.",
      "Talks about everyday topics (family, shopping, work) and describes past events in a simple way.",
    ],
  },
  B1: {
    name: ["Intermediário", "Intermediate"],
    description: [
      "Se vira bem em viagens, conta experiências, dá opiniões e entende o principal de conversas claras.",
      "Gets by while travelling, describes experiences, gives opinions and understands the main points of clear speech.",
    ],
  },
  B2: {
    name: ["Intermediário avançado", "Upper intermediate"],
    description: [
      "Conversa com naturalidade com nativos, entende textos mais complexos e defende pontos de vista.",
      "Talks fluently with native speakers, understands more complex texts and argues a point of view.",
    ],
  },
  C1: {
    name: ["Avançado", "Advanced"],
    description: [
      "Usa o inglês com flexibilidade no trabalho e nos estudos, com estruturas complexas e vocabulário variado.",
      "Uses English flexibly for work and study, with complex structures and a wide vocabulary.",
    ],
  },
  C2: {
    name: ["Proficiente", "Proficient"],
    description: [
      "Domina o idioma quase como um nativo, percebendo nuances e diferenças sutis de sentido.",
      "Masters the language almost like a native speaker, picking up nuances and subtle differences in meaning.",
    ],
  },
};

export function isCefrLevel(v: string | null | undefined): v is CefrLevel {
  return !!v && (CEFR_LEVELS as readonly string[]).includes(v);
}

export interface LevelTestQuestion {
  level: CefrLevel;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface LevelTest {
  questions: LevelTestQuestion[];
  listening: { youtubeVideoId: string; questions: LevelTestQuestion[] } | null;
}

export type LevelBreakdown = Partial<Record<CefrLevel, { correct: number; total: number }>>;

export interface LevelTestAttempt {
  id: string;
  level: CefrLevel;
  score: number;
  total: number;
  byLevel: LevelBreakdown;
  submittedAt: string;
}

export interface LevelTestAttemptDetail extends LevelTestAttempt {
  studentId: string;
  studentName: string;
  answers: number[];
  questions: LevelTestQuestion[];
  listening: LevelTest["listening"];
}
