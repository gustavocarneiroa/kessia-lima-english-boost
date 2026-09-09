import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3200),
  HOST: z.string().default("127.0.0.1"),

  PUBLIC_WEB_ORIGIN: z.string().url().default("https://www.teacherkessialima.com.br"),
  EXTRA_CORS_ORIGINS: z.string().optional(),

  TEACHER_EMAIL_DOMAIN: z.string().min(1).default("teacherkessialima.com.br"),
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
