// Teste de nível (escala CEFR). As regras de correção ficam no servidor
// (server/src/lib/levelTest.ts) — aqui só os tipos e os textos de cada nível.

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Enquanto false, só a professora vê o teste (menu, aviso e "Liberar" escondidos pro aluno).
 * Mudar junto com o mesmo nome em server/src/lib/levelTest.ts. */
export const LEVEL_TEST_FOR_STUDENTS = true;

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

/** Pergunta de listening: igual à normal, mas pode marcar o momento do vídeo (em segundos). */
export interface ListeningQuestion extends LevelTestQuestion {
  startSeconds?: number;
}

/** Um vídeo do listening e as perguntas sobre ele. */
export interface ListeningPart<Q = ListeningQuestion> {
  youtubeVideoId: string;
  questions: Q[];
}

export interface LevelTest {
  questions: LevelTestQuestion[];
  /** Vídeos do teste, em geral do mais fácil ao mais difícil. Vazio = sem listening. Cada vídeo
   * entra na sequência logo depois das perguntas do nível mais alto entre as suas próprias
   * perguntas (ver `buildTestSequence`) — não necessariamente no fim do teste. */
  listening: ListeningPart[];
}

/** Em qual nível (o mais alto entre as perguntas do vídeo) ele deve aparecer — mesma regra do servidor. */
function listeningAnchor<Q extends { level: CefrLevel }>(part: ListeningPart<Q>): CefrLevel {
  let best: CefrLevel = CEFR_LEVELS[0];
  for (const q of part.questions) {
    if (CEFR_LEVELS.indexOf(q.level) > CEFR_LEVELS.indexOf(best)) best = q.level;
  }
  return best;
}

export interface TestSlot<Q> {
  question: Q;
  /** Preenchido em toda pergunta do vídeo. `first` marca a primeira (pra mostrar um título uma vez só). */
  video: { part: ListeningPart<Q>; number: number; first: boolean } | null;
}

/**
 * Monta a sequência completa de perguntas (gramática/leitura + listening) na ordem em que o
 * aluno responde — a mesma ordem que `allQuestions` monta no servidor em
 * server/src/lib/levelTest.ts. Cada vídeo aparece logo depois das perguntas do seu próprio nível.
 */
export function buildTestSequence<Q extends { level: CefrLevel }>(questions: Q[], listening: ListeningPart<Q>[]): TestSlot<Q>[] {
  const slots: TestSlot<Q>[] = [];
  for (const level of CEFR_LEVELS) {
    for (const q of questions.filter((item) => item.level === level)) slots.push({ question: q, video: null });
    listening.forEach((part, n) => {
      if (listeningAnchor(part) !== level) return;
      part.questions.forEach((q, i) => slots.push({ question: q, video: { part, number: n + 1, first: i === 0 } }));
    });
  }
  return slots;
}

/** mm:ss (ou h:mm:ss) → segundos. Vazio/inválido → undefined. */
export function parseTimestamp(input: string): number | undefined {
  const parts = input.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return undefined;
  const nums = parts.map(Number);
  const [h, m, s] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
  if (m > 59 || s > 59) return undefined;
  return h * 3600 + m * 60 + s;
}

/** segundos → mm:ss (ou h:mm:ss). undefined/0 → "". */
export function formatTimestamp(seconds: number | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
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

/** Enunciado com linha em branco = texto de leitura (antes) + pergunta (depois da última). */
export function splitPrompt(prompt: string): { passage: string | null; question: string } {
  const i = prompt.lastIndexOf("\n\n");
  if (i === -1) return { passage: null, question: prompt };
  return { passage: prompt.slice(0, i).trim(), question: prompt.slice(i + 2).trim() };
}
