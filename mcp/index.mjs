#!/usr/bin/env node
// MCP do portal da Teacher Kessia Lima: deixa o Claude fazer tarefas do portal
// (criar atividades, enviar pra alunos, ver alunos, etc.) usando a "chave de acesso
// do Claude" gerada em Portal → Configurações → Acesso do Claude.
//
// A chave vem da variável KESSIA_PORTAL_TOKEN ou do arquivo ~/.kessia-portal-token.
// O endereço da API pode ser trocado com KESSIA_API_URL (padrão: produção).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = (process.env.KESSIA_API_URL || "https://api.teacherkessialima.com.br").replace(/\/+$/, "");
const TOKEN_FILE = join(homedir(), ".kessia-portal-token");

function readToken() {
  if (process.env.KESSIA_PORTAL_TOKEN?.trim()) return process.env.KESSIA_PORTAL_TOKEN.trim();
  try {
    return readFileSync(TOKEN_FILE, "utf8").trim() || null;
  } catch {
    return null;
  }
}

class PortalError extends Error {}

async function call(method, path, body) {
  const token = readToken();
  if (!token) {
    throw new PortalError(
      `Sem chave de acesso. Gere uma em ${"https://teacherkessialima.com.br/portal/configuracoes"} (card "Acesso do Claude") e salve no arquivo ${TOKEN_FILE}.`,
    );
  }
  if (!path.startsWith("/api/")) throw new PortalError('O caminho precisa começar com "/api/".');
  const res = await fetch(API_URL + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data && typeof data === "object" && data.message ? data.message : text.slice(0, 500);
    if (res.status === 401) throw new PortalError(`O portal não reconheceu a chave (401). Ela pode ter sido apagada — gere outra em Configurações. ${msg}`);
    throw new PortalError(`Erro ${res.status} em ${method} ${path}: ${msg}`);
  }
  return data;
}

const ok = (data) => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
const fail = (err) => ({ isError: true, content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }] });
const wrap = (fn) => async (args) => {
  try {
    return ok(await fn(args));
  } catch (err) {
    return fail(err);
  }
};

const WEB = "https://teacherkessialima.com.br";

const ROUTES = `
Rotas da API da professora (todas sob ${API_URL}; use portal_get / portal_request pras que não têm ferramenta própria):
- Alunos: GET /api/students (?archived=1 pros arquivados), GET /api/students/:id, GET|PUT /api/students/:id/profile,
  POST /api/students {email}, POST /api/students/:id/reset-link (link de convite/redefinição), POST /api/students/:id/archive|unarchive,
  GET /api/students/:id/contracts, GET /api/birthdays/today
- Atividades: GET /api/activities (?page, ?pageSize até 100, ?studentId), GET|PUT|DELETE /api/activities/:id, POST /api/activities,
  PUT /api/activities/:id/students {studentIds} (SUBSTITUI a lista toda), PUT /api/activities/:id/answers/:studentId/grade
- Aulas: /api/lessons (GET, POST, PUT/DELETE :id) · Trilha: /api/learning-topics · Recursos: /api/resources · Avisos: /api/notices
- Vocabulário: /api/vocab/lists (GET, POST), /api/vocab/lists/:id (PATCH, DELETE), /api/vocab/lists/:id/cards (POST {word}),
  /api/vocab/lists/:id/cards/manual, /api/vocab/lists/:id/students (PUT {studentIds})
- Calendário (dias sem aula): GET|POST /api/days-off, DELETE /api/days-off/:id
- Financeiro: /api/payments (GET, POST, PUT/DELETE :id), POST /api/payments/generate-month
- Orçamentos/contratos: /api/quotes, /api/quotes/:id/convert, GET /api/contracts, GET /api/contracts/pending
- Teste de nível: /api/level-test, /api/level-test/students, POST /api/level-test/send
- Preços: GET /api/pricing, PUT /api/pricing
Se não souber o formato exato de um corpo, leia o código em server/src/modules/<módulo>/routes.ts (se estiver no projeto) ou faça um GET antes.
`;

const server = new McpServer(
  { name: "kessia-portal", version: "1.0.0" },
  {
    instructions: `Portal da Teacher Kessia Lima (${WEB}/portal). Estas ferramentas agem como a professora, direto no site de verdade (produção).
A Kessia não é programadora: fale com ela em português simples e, depois de criar/alterar algo, diga onde ela vê o resultado (link ${WEB}/portal/...).
Antes de apagar algo, enviar algo pra alunos ou mexer em dinheiro (cobranças, contratos), confirme com ela.
Atividades novas ficam só na lista de Atividades (ninguém recebe) até serem enviadas com send_activity_to_students.
${ROUTES}`,
  },
);

// ---------- Ferramentas genéricas ----------

server.registerTool(
  "portal_get",
  {
    title: "Ler dados do portal",
    description: "Faz um GET em qualquer rota /api/... do portal (só leitura). Veja a lista de rotas nas instruções do servidor.",
    inputSchema: { path: z.string().describe('Caminho com query, ex.: "/api/students" ou "/api/activities?pageSize=100"') },
    annotations: { readOnlyHint: true },
  },
  wrap(({ path }) => call("GET", path)),
);

server.registerTool(
  "portal_request",
  {
    title: "Alterar dados do portal",
    description:
      "POST/PUT/PATCH/DELETE em qualquer rota /api/... do portal, agindo como a professora no site de produção. Use quando não houver uma ferramenta específica. Confirme com a professora antes de apagar ou de mexer em cobranças/contratos.",
    inputSchema: {
      method: z.enum(["POST", "PUT", "PATCH", "DELETE"]),
      path: z.string().describe('ex.: "/api/days-off"'),
      body: z.any().optional().describe("Corpo JSON (objeto), quando a rota pede"),
    },
    annotations: { destructiveHint: true },
  },
  wrap(({ method, path, body }) => call(method, path, body)),
);

// ---------- Alunos ----------

server.registerTool(
  "list_students",
  {
    title: "Listar alunos",
    description: "Lista os alunos ativos (ou os arquivados) com id, nome e e-mail.",
    inputSchema: { archived: z.boolean().optional().describe("true pra listar os arquivados") },
    annotations: { readOnlyHint: true },
  },
  wrap(async ({ archived }) => {
    // Sem "page" a rota devolve a lista inteira.
    const res = await call("GET", `/api/students${archived ? "?archived=1" : ""}`);
    const all = Array.isArray(res) ? res : res.items ?? [];
    return all.map((s) => ({ id: s.id, name: s.fullName ?? null, email: s.email, hasLoggedIn: s.hasLoggedIn, archivedAt: s.archivedAt ?? null }));
  }),
);

// ---------- Atividades ----------

server.registerTool(
  "list_activities",
  {
    title: "Listar atividades",
    description: "Lista as atividades (mais novas primeiro) com id, título e tipo. Com studentId, só as enviadas pra esse aluno, com a nota dele.",
    inputSchema: {
      studentId: z.string().optional(),
      page: z.number().int().min(1).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  wrap(async ({ studentId, page }) => {
    const res = await call("GET", `/api/activities?pageSize=100&page=${page ?? 1}${studentId ? `&studentId=${encodeURIComponent(studentId)}` : ""}`);
    return {
      total: res.total,
      items: res.items.map((a) => ({
        id: a.id,
        title: a.title,
        kind: a.kind,
        createdAt: a.createdAt,
        ...(a.studentAnswer !== undefined ? { studentAnswer: a.studentAnswer } : {}),
        link: `${WEB}/portal/atividades/${a.id}`,
      })),
    };
  }),
);

server.registerTool(
  "get_activity",
  {
    title: "Ver atividade",
    description: "Mostra uma atividade completa: perguntas, gabarito, alunos que receberam (studentIds) e respostas.",
    inputSchema: { id: z.string() },
    annotations: { readOnlyHint: true },
  },
  wrap(({ id }) => call("GET", `/api/activities/${encodeURIComponent(id)}`)),
);

const instruction = z
  .string()
  .optional()
  .describe(
    'Enunciado. Preenchido = começa uma questão numerada nova (1., 2., ...); vazio = o item continua a questão anterior como a), b), c)...',
  );

const quizItem = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("choice"),
    instruction,
    prompt: z.string().min(1).describe('Pergunta. Use "_____" pra lacuna.'),
    options: z.array(z.string().min(1)).min(2).max(6),
    correctIndex: z.number().int().min(0).describe("Índice (a partir de 0) da opção certa"),
  }),
  z.object({
    type: z.literal("blank"),
    instruction,
    prompt: z.string().min(1).describe('Frase pra completar ou pergunta aberta. Use "_____" pra lacuna.'),
    answer: z
      .string()
      .optional()
      .describe('Gabarito: com ele a correção é automática (aceita várias com "/", ex.: "I\'d / I would"). Sem ele, a professora corrige à mão.'),
  }),
  z.object({
    type: z.literal("translate"),
    instruction,
    prompt: z.string().min(1).describe("Frase em português pra traduzir pro inglês"),
    answer: z.string().optional().describe("Sugestão de resposta (o aluno só vê depois de enviar). Sempre corrigida à mão."),
  }),
  z.object({
    type: z.literal("wordbank"),
    instruction: z.string().optional().describe('ex.: "Complete the sentences with the words from the box."'),
    words: z.array(z.string().min(1)).min(1).max(60),
    sentences: z
      .array(z.object({ prompt: z.string().min(1).describe('Frase com "_____"'), answer: z.string().optional().describe("Uma das palavras do quadro") }))
      .min(1)
      .describe("Frases do banco de palavras (o aluno arrasta a palavra pra lacuna)"),
  }),
]);

// O banco de palavras vira o quadro { type: "wordbank", words, blanks } seguido das frases como "blank" — igual ao formulário do portal.
function toPayloadItems(questions) {
  return questions.flatMap((q) => {
    if (q.type !== "wordbank") return [{ ...q, instruction: q.instruction ?? "" }];
    return [
      { type: "wordbank", instruction: q.instruction ?? "", words: q.words, blanks: q.sentences.length },
      ...q.sentences.map((s) => ({ type: "blank", instruction: "", prompt: s.prompt, answer: s.answer ?? "" })),
    ];
  });
}

const quizInput = {
  title: z.string().min(1).max(200),
  intro: z.string().max(10000).optional().describe("Explicação / review mostrada no topo (quebras de linha mantidas, links ficam clicáveis)"),
  questions: z.array(quizItem).min(1).describe("Até 60 itens no total (cada frase do banco de palavras conta como 1)"),
};

server.registerTool(
  "create_quiz_activity",
  {
    title: "Criar atividade \"Feita por você\"",
    description:
      "Cria uma atividade do tipo \"Feita por você\" (múltipla escolha / completar / tradução / banco de palavras). Ela fica na lista de Atividades sem ser enviada pra ninguém. Devolve o id e o link.",
    inputSchema: quizInput,
  },
  wrap(async ({ title, intro, questions }) => {
    const row = await call("POST", "/api/activities", { kind: "quiz", title, intro: intro ?? "", questions: toPayloadItems(questions) });
    return { id: row.id, title: row.title, link: `${WEB}/portal/atividades/${row.id}` };
  }),
);

server.registerTool(
  "update_quiz_activity",
  {
    title: "Editar atividade \"Feita por você\"",
    description: "Substitui título, explicação e perguntas de uma atividade \"Feita por você\" existente (mande a lista completa de perguntas).",
    inputSchema: { id: z.string(), ...quizInput },
    annotations: { destructiveHint: true },
  },
  wrap(async ({ id, title, intro, questions }) => {
    await call("PUT", `/api/activities/${encodeURIComponent(id)}`, { title, intro: intro ?? "", questions: toPayloadItems(questions) });
    return { id, link: `${WEB}/portal/atividades/${id}` };
  }),
);

server.registerTool(
  "create_listening_activity",
  {
    title: "Criar atividade de listening",
    description: "Cria uma atividade de listening com um vídeo do YouTube e perguntas de múltipla escolha (até 20).",
    inputSchema: {
      title: z.string().min(1).max(200),
      youtubeUrl: z.string().min(1),
      questions: z
        .array(z.object({ prompt: z.string().min(1), options: z.array(z.string().min(1)).min(2).max(6), correctIndex: z.number().int().min(0) }))
        .min(1)
        .max(20),
    },
  },
  wrap(async (args) => {
    const row = await call("POST", "/api/activities", { kind: "listening", ...args });
    return { id: row.id, title: row.title, link: `${WEB}/portal/atividades/${row.id}` };
  }),
);

server.registerTool(
  "send_activity_to_students",
  {
    title: "Enviar atividade pra alunos",
    description:
      "Libera uma atividade pra alunos (eles recebem aviso de novidade). Por padrão SOMA aos que já tinham; com replace=true a lista vira exatamente studentIds (quem sair perde o acesso). Pegue os ids com list_students.",
    inputSchema: {
      activityId: z.string(),
      studentIds: z.array(z.string()),
      replace: z.boolean().optional(),
    },
  },
  wrap(async ({ activityId, studentIds, replace }) => {
    let ids = studentIds;
    if (!replace) {
      const current = await call("GET", `/api/activities/${encodeURIComponent(activityId)}`);
      ids = [...new Set([...(current.studentIds ?? []), ...studentIds])];
    }
    await call("PUT", `/api/activities/${encodeURIComponent(activityId)}/students`, { studentIds: ids });
    return { ok: true, activityId, studentIds: ids, link: `${WEB}/portal/atividades/${activityId}` };
  }),
);

await server.connect(new StdioServerTransport());
