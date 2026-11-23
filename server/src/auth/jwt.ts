import { SignJWT, jwtVerify } from "jose";
import { env } from "../env.ts";

const secret = new TextEncoder().encode(env.JWT_SECRET);
export const SESSION_COOKIE = "kessia_session";
const TTL_SECONDS = 60 * 60 * 24 * 30;

export interface SessionPayload {
  userId: string;
  email: string;
  role: "teacher" | "student";
  // Cópia de users.session_version no momento do login. Se a versão do usuário subir
  // (troca de senha, "sair de todos os aparelhos"), a sessão para de valer.
  // Sessões antigas, de antes desse campo existir, chegam sem ele e contam como 0.
  sessionVersion?: number;
  // true quando o pedido veio com uma chave de acesso (api_tokens) em vez do cookie.
  viaToken?: boolean;
  // "Ver como aluno": a professora (teacherId) está olhando o portal como esse aluno.
  // Só leitura — ver blockWritesWhileViewing em guards.ts.
  viewAs?: { teacherId: string };
}

// "Ver como aluno" fica num cookie à parte, curto, ligado à professora que pediu.
export const VIEW_AS_COOKIE = "kessia_view_as";
const VIEW_AS_TTL_SECONDS = 60 * 60 * 2;

export async function signViewAs(teacherId: string, studentId: string): Promise<string> {
  return await new SignJWT({ teacherId, studentId, kind: "view_as" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VIEW_AS_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyViewAs(token: string): Promise<{ teacherId: string; studentId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.kind !== "view_as" || typeof payload.teacherId !== "string" || typeof payload.studentId !== "string") {
      return null;
    }
    return { teacherId: payload.teacherId, studentId: payload.studentId };
  } catch {
    return null;
  }
}

export const viewAsCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: VIEW_AS_TTL_SECONDS,
};

export async function signSession(payload: Required<Omit<SessionPayload, "viaToken">>): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};
