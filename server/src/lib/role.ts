import { env } from "../env.ts";

export type Role = "teacher" | "student";

export function getRoleFromEmail(email: string): Role {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return domain === env.TEACHER_EMAIL_DOMAIN.toLowerCase() ? "teacher" : "student";
}
