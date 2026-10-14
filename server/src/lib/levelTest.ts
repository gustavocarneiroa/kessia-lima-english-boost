import { z } from "zod";
import { getSetting, setSetting } from "./settings.ts";

// Teste de nível (escala CEFR, A1 → C2). Cada pergunta é de múltipla escolha e marcada
// com o nível que ela mede. O nível do aluno é o mais alto em que ele acertou pelo menos
// PASS_RATIO das perguntas, sem pular nenhum nível abaixo (ver scoreLevelTest).

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

// Enquanto false, só a professora vê o teste (pra revisar as perguntas): as rotas do aluno
// respondem 404 e não dá pra liberar. Mudar junto com o mesmo nome em frontend/src/lib/levelTest.ts.
export const LEVEL_TEST_FOR_STUDENTS = false;

const PASS_RATIO = 0.6;
const SETTING_KEY = "level_test";

/** Resposta "não sei" — conta como errada, mas não chuta. */
export const DONT_KNOW = -1;

export const levelTestQuestionSchema = z
  .object({
    level: z.enum(CEFR_LEVELS),
    prompt: z.string().trim().min(1).max(2000),
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
    correctIndex: z.number().int().min(0),
  })
  .refine((q) => q.correctIndex < q.options.length, { message: "correctIndex fora do intervalo" });

export const levelTestSchema = z.object({
  questions: z.array(levelTestQuestionSchema).min(1).max(120),
  // Parte de listening (opcional): um vídeo do YouTube e perguntas sobre ele, no fim do teste.
  listening: z
    .object({
      youtubeVideoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
      questions: z.array(levelTestQuestionSchema).min(1).max(30),
    })
    .nullable(),
});

export type LevelTestQuestion = z.infer<typeof levelTestQuestionSchema>;
export type LevelTest = z.infer<typeof levelTestSchema>;
export type LevelBreakdown = Record<CefrLevel, { correct: number; total: number }>;

// Monta uma pergunta com a resposta certa na posição `at` (pra não ficar sempre na mesma letra).
function mc(level: CefrLevel, prompt: string, correct: string, wrong: [string, string, string], at: 0 | 1 | 2 | 3) {
  const options = [...wrong];
  options.splice(at, 0, correct);
  return { level, prompt, options, correctIndex: at };
}

// Reading comprehension: um texto curto + uma pergunta, um por nível. O texto vem antes de
// uma linha em branco e a pergunta depois — a tela do aluno mostra o texto num quadro à parte.
const reading = (text: string, question: string) => `${text}\n\n${question}`;

const READING = {
  A1: mc(
    "A1",
    reading(
      "Hi! I'm Tom. I'm 25 years old and I'm from Canada. I live in a small apartment with my cat, Max. I work in a bookshop. On Sundays, I play football with my friends.",
      "Where does Tom work?",
    ),
    "In a bookshop.",
    ["In a school.", "In a restaurant.", "At home."],
    2,
  ),
  A2: mc(
    "A2",
    reading(
      "Last summer, Maria went to Lisbon with her sister. They stayed in a small hotel near the river. The weather was very hot, so they visited museums in the afternoon and walked around the city in the evening. Maria's favourite part of the trip was the food, especially the fresh fish.",
      "Why did they visit museums in the afternoon?",
    ),
    "Because it was very hot outside.",
    ["Because the museums were free in the afternoon.", "Because Maria's sister loves art.", "Because it was raining."],
    1,
  ),
  B1: mc(
    "B1",
    reading(
      "Dear Mr. Lee,\nI am writing to complain about the headphones I bought from your website last week. When they arrived, the left side didn't work and the box was damaged. I have tried to call your customer service three times, but nobody has answered. I would like a full refund, not a replacement.\nYours sincerely,\nAna Costa",
      "What does Ana want?",
    ),
    "Her money back.",
    ["A new pair of headphones.", "A discount on her next order.", "Someone to repair the headphones."],
    3,
  ),
  B2: mc(
    "B2",
    reading(
      "Working from home was once seen as a privilege for a lucky few. Since 2020, however, it has become common in many industries. Supporters argue that it saves time and money and gives employees more control over their day. Critics, on the other hand, point out that it can blur the line between work and personal life, and that younger employees may miss out on learning from more experienced colleagues.",
      "According to the text, what is one concern about working from home?",
    ),
    "Less experienced workers may learn less from senior colleagues.",
    ["Companies have to spend more money on offices.", "Employees have less control over their schedule.", "It is only possible in a few industries."],
    0,
  ),
  C1: mc(
    "C1",
    reading(
      "The notion that we only use 10% of our brains is remarkably persistent, despite having been thoroughly debunked by neuroscientists. Brain imaging shows that even simple tasks activate multiple regions, and that over the course of a day virtually every part of the brain is put to use. The myth's appeal arguably lies less in science than in its flattering suggestion that we all possess vast untapped potential.",
      "According to the writer, why does the myth remain popular?",
    ),
    "It suggests that people have hidden abilities waiting to be unlocked.",
    ["Brain scans seem to support it.", "Neuroscientists have never studied it.", "Simple tasks really do use only a small part of the brain."],
    2,
  ),
  C2: mc(
    "C2",
    reading(
      "The minister's announcement was, to put it charitably, economical with detail. While the figures were presented with considerable fanfare, the press release made no mention of how the scheme would be funded, nor of the public consultation that had been promised a year earlier. Seasoned observers were quick to note that the timing — the week before a crucial vote — was unlikely to be a coincidence.",
      "What does the writer imply about the announcement?",
    ),
    "It was made at that moment mainly for political advantage.",
    ["It was carefully explained and fully funded.", "It followed a long public consultation.", "Journalists paid no attention to it."],
    1,
  ),
};

// Perguntas da primeira versão que viraram reading. Testes já salvos pela professora
// ganham o reading no lugar delas — mas só se ela não tiver mexido na pergunta antiga.
const REPLACED_BY_READING: [LevelTestQuestion, LevelTestQuestion][] = [
  [mc("A1", "There ___ two books on the table.", "are", ["is", "be", "has"], 2), READING.A1],
  [mc("A2", "How ___ money do you have?", "much", ["many", "lot", "few"], 0), READING.A2],
  [mc("B1", "That's the man ___ car was stolen.", "whose", ["who", "which", "whom"], 0), READING.B1],
  [mc("B2", "___ the bad weather, the flight left on time.", "Despite", ["Although", "Even though", "In spite"], 0), READING.B2],
  [mc("C1", "The new law is likely to ___ a lot of criticism.", "give rise to", ["give in to", "give off", "give away"], 3), READING.C1],
  [mc("C2", "So ___ was the storm that all flights were cancelled.", "severe", ["severely", "severity", "much severe"], 3), READING.C2],
];

function withReadings(test: LevelTest): LevelTest {
  const same = (a: LevelTestQuestion, b: LevelTestQuestion) => JSON.stringify(a) === JSON.stringify(b);
  return {
    ...test,
    questions: test.questions.map((q) => REPLACED_BY_READING.find(([old]) => same(old, q))?.[1] ?? q),
  };
}

// Escrita pra a professora revisar e ajustar na tela "Teste de nível".
export const DEFAULT_LEVEL_TEST: LevelTest = {
  questions: [
    // A1
    mc("A1", "My name ___ Ana.", "is", ["am", "are", "be"], 0),
    mc("A1", "___ you from Brazil?", "Are", ["Is", "Do", "Am"], 0),
    mc("A1", "They ___ a big house.", "have", ["has", "haves", "having"], 2),
    mc("A1", "This is ___ umbrella.", "an", ["a", "the a", "some"], 1),
    mc("A1", "She ___ coffee every morning.", "drinks", ["drink", "drinking", "is drink"], 3),
    READING.A1,

    // A2
    mc("A2", "I ___ to the cinema last weekend.", "went", ["go", "goes", "have gone"], 1),
    mc("A2", "My sister is ___ than me.", "taller", ["more tall", "tallest", "the taller"], 0),
    mc("A2", "We ___ dinner when the phone rang.", "were having", ["had", "have", "are having"], 3),
    mc("A2", "You ___ wear a seatbelt in the car. It's the law.", "must", ["might", "would", "could"], 2),
    mc("A2", "I'm going ___ my grandparents next Sunday.", "to visit", ["visit", "visiting", "visited"], 1),
    READING.A2,

    // B1
    mc("B1", "I ___ in this city since 2015.", "have lived", ["live", "am living", "lived"], 3),
    mc("B1", "If it rains tomorrow, we ___ at home.", "will stay", ["would stay", "stayed", "would have stayed"], 0),
    mc("B1", "This book ___ by millions of people.", "has been read", ["has read", "is reading", "have been read"], 2),
    mc("B1", "She asked me where ___.", "I lived", ["did I live", "do I live", "I do live"], 1),
    mc("B1", "I'm not used to ___ up so early.", "getting", ["get", "got", "be getting"], 3),
    READING.B1,

    // B2
    mc("B2", "If she had studied harder, she ___ the exam.", "would have passed", ["would pass", "will pass", "had passed"], 2),
    mc("B2", "By the time we arrived, the film ___.", "had already started", ["already started", "has already started", "was already starting"], 0),
    mc("B2", "I wish I ___ that to her yesterday.", "hadn't said", ["didn't say", "wouldn't say", "haven't said"], 1),
    mc("B2", "He denied ___ the money.", "taking", ["to take", "take", "to have took"], 3),
    mc("B2", "The meeting has been ___ until next week.", "put off", ["put out", "put up", "put away"], 2),
    READING.B2,

    // C1
    mc("C1", "Hardly ___ arrived when it started to rain.", "had we", ["we had", "did we", "we have"], 1),
    mc("C1", "It's high time you ___ a decision.", "made", ["make", "will make", "have made"], 3),
    mc("C1", "Not until the end of the film ___ who the killer was.", "did I realise", ["I realised", "I did realise", "realised I"], 0),
    mc("C1", "The report ___ to have been written by an expert.", "is believed", ["believes", "is believing", "has believed"], 2),
    mc("C1", "She's very ___; she always thinks about how others feel.", "considerate", ["considerable", "considering", "consider"], 1),
    READING.C1,

    // C2
    mc("C2", "___ plausible his explanation seemed, nobody believed him.", "However", ["Whatever", "Although", "Even"], 0),
    mc("C2", "The company's success is largely ___ to its customer service.", "attributable", ["attributed by", "responsible", "due for"], 2),
    mc("C2", "I'd rather you ___ mention this to anyone.", "didn't", ["don't", "won't", "not"], 1),
    mc("C2", "He was ___ to admit he was wrong, but eventually he did.", "loath", ["loathe", "loathing", "loathed"], 0),
    READING.C2,
    mc("C2", "Were the government ___ taxes again, there would be protests.", "to raise", ["raising", "raise", "raised"], 2),
  ],
  listening: null,
};

export function getLevelTest(): LevelTest {
  const raw = getSetting(SETTING_KEY);
  if (!raw) return DEFAULT_LEVEL_TEST;
  try {
    const parsed = levelTestSchema.safeParse(JSON.parse(raw));
    return parsed.success ? withReadings(parsed.data) : DEFAULT_LEVEL_TEST;
  } catch {
    return DEFAULT_LEVEL_TEST;
  }
}

export function saveLevelTest(test: LevelTest): void {
  setSetting(SETTING_KEY, JSON.stringify(test));
}

/** Todas as perguntas na ordem em que o aluno responde: gramática/vocabulário, depois listening. */
export function allQuestions(test: LevelTest): LevelTestQuestion[] {
  return [...test.questions, ...(test.listening?.questions ?? [])];
}

/** O teste sem as respostas certas — é isso que o aluno recebe. */
export function levelTestForStudent(test: LevelTest) {
  const strip = (q: LevelTestQuestion) => ({ prompt: q.prompt, options: q.options });
  return {
    questions: test.questions.map(strip),
    listening: test.listening
      ? { youtubeVideoId: test.listening.youtubeVideoId, questions: test.listening.questions.map(strip) }
      : null,
  };
}

export function scoreLevelTest(test: LevelTest, answers: number[]) {
  const questions = allQuestions(test);
  const byLevel = Object.fromEntries(CEFR_LEVELS.map((l) => [l, { correct: 0, total: 0 }])) as LevelBreakdown;
  let score = 0;
  questions.forEach((q, i) => {
    const ok = answers[i] === q.correctIndex;
    byLevel[q.level].total += 1;
    if (ok) {
      byLevel[q.level].correct += 1;
      score += 1;
    }
  });

  // Sobe nível a nível enquanto o aluno for aprovado; para no primeiro em que não for.
  // Níveis sem nenhuma pergunta não contam nem a favor nem contra. Quem não passa nem
  // no A1 fica como A1 (começando do zero).
  let level: CefrLevel = "A1";
  for (const l of CEFR_LEVELS) {
    const { correct, total } = byLevel[l];
    if (total === 0) continue;
    if (correct / total < PASS_RATIO) break;
    level = l;
  }

  return { score, total: questions.length, level, byLevel };
}
