import type { FastifyInstance } from "fastify";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.ts";
import { requireTeacher } from "../../auth/guards.ts";
import { getSetting, setSetting } from "../../lib/settings.ts";
import { blockedFor, registerFailure, tooManyAttempts } from "../../lib/rate-limit.ts";

// Horror Movie Awards: os alunos votam numa página aberta (/awards, sem login) e a
// professora vê o resultado no portal. Mesmas categorias de frontend/src/lib/horrorAwards.ts.
const CATEGORY_IDS = ["scariest", "creepiest", "twist", "overrated", "halloween"] as const;
type CategoryId = (typeof CATEGORY_IDS)[number];

const OPEN_SETTING = "horror_awards_open";

function isOpen() {
  return getSetting(OPEN_SETTING) !== "false";
}

const pickSchema = z.object({
  pick: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(400).optional().default(""),
});

const voteBody = z.object({
  voterId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  picks: z.record(z.enum(CATEGORY_IDS), pickSchema),
});

type Picks = Partial<Record<CategoryId, { pick: string; reason: string }>>;

// "The Ring", "the ring!" e "The  Ring" contam como o mesmo indicado.
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "");
}

export async function awardsRoutes(app: FastifyInstance) {
  app.get("/api/awards", async () => ({ open: isOpen() }));

  app.post("/api/awards/vote", async (req, reply) => {
    const wait = blockedFor("awardsIp", req.ip);
    if (wait > 0) return reply.code(429).send(tooManyAttempts(wait));
    if (!isOpen()) return reply.code(403).send({ error: "closed", message: "Voting is closed." });

    const parsed = voteBody.safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data.picks).length === 0) {
      return reply.code(400).send({ error: "invalid_body", message: "Write your name and choose at least one nominee." });
    }
    registerFailure("awardsIp", req.ip);

    const { voterId, name, picks } = parsed.data;
    const now = new Date().toISOString();
    db.insert(schema.horrorAwardVotes)
      .values({ voterId, name, picks: JSON.stringify(picks), createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: schema.horrorAwardVotes.voterId,
        set: { name, picks: JSON.stringify(picks), updatedAt: now },
      })
      .run();
    return { ok: true };
  });

  app.get("/api/awards/results", { preHandler: requireTeacher }, async () => {
    const rows = db.select().from(schema.horrorAwardVotes).orderBy(desc(schema.horrorAwardVotes.updatedAt)).all();
    const categories = CATEGORY_IDS.map((id) => {
      type Group = { spellings: Map<string, number>; voters: { name: string; reason: string }[] };
      const groups = new Map<string, Group>();
      for (const row of rows) {
        const p = (JSON.parse(row.picks) as Picks)[id];
        if (!p) continue;
        const key = normalize(p.pick) || p.pick.toLowerCase();
        const g: Group = groups.get(key) ?? { spellings: new Map(), voters: [] };
        g.spellings.set(p.pick, (g.spellings.get(p.pick) ?? 0) + 1);
        g.voters.push({ name: row.name, reason: p.reason });
        groups.set(key, g);
      }
      const results = [...groups.values()]
        .map((g) => ({
          // mostra a grafia que mais gente usou
          label: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
          count: g.voters.length,
          voters: g.voters,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      return { id, results };
    });
    return {
      open: isOpen(),
      voters: rows.map((r) => ({ name: r.name, updatedAt: r.updatedAt })),
      categories,
    };
  });

  app.put("/api/awards/open", { preHandler: requireTeacher }, async (req, reply) => {
    const parsed = z.object({ open: z.boolean() }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body", message: "Requisição inválida." });
    setSetting(OPEN_SETTING, String(parsed.data.open));
    return { open: parsed.data.open };
  });

  app.delete("/api/awards/votes", { preHandler: requireTeacher }, async (_req, reply) => {
    db.delete(schema.horrorAwardVotes).run();
    return reply.code(204).send();
  });
}
