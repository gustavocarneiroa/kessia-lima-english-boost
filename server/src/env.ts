import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3200),
  HOST: z.string().default("127.0.0.1"),

  DATABASE_PATH: z.string().default("./data/kessia.db"),
  AUDIO_DIR: z.string().optional(),

  PUBLIC_WEB_ORIGIN: z.string().url().default("https://www.teacherkessialima.com.br"),
  EXTRA_CORS_ORIGINS: z.string().optional(),

  JWT_SECRET: z.string().min(32),

  // Domínio de e-mail que identifica professora (qualquer outro e-mail é tratado como aluno)
  TEACHER_EMAIL_DOMAIN: z.string().min(1).default("teacherkessialima.com.br"),
  ADMIN_EMAIL: z.string().email().default("kessialima@teacherkessialima.com.br"),

  // Nome/id do Relying Party usado pelo WebAuthn — precisa bater com o domínio do front.
  WEBAUTHN_RP_ID: z.string().min(1).default("teacherkessialima.com.br"),
  WEBAUTHN_RP_NAME: z.string().min(1).default("Teacher Kessia Lima"),

  // Chave da API do Merriam-Webster's Learner's Dictionary (dictionaryapi.com)
  MERRIAM_WEBSTER_LEARNERS_KEY: z.string().min(1),

  // Chave da API do Pexels, usada pra buscar a imagem ilustrativa de cada card (pexels.com/api)
  // Opcional por enquanto: sem ela a busca de imagem simplesmente não acontece.
  PEXELS_API_KEY: z.string().min(1).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Configuração inválida:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = [
  env.PUBLIC_WEB_ORIGIN,
  env.PUBLIC_WEB_ORIGIN.replace("://www.", "://"),
  ...(env.EXTRA_CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? []),
];
