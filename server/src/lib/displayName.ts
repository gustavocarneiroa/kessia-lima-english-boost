export const TEACHER_DISPLAY_NAME = "Teacher Késsia";

// Nome que os outros veem (fórum, ranking do Wordle): a professora aparece sempre
// como "Teacher Késsia"; aluno pelo nome do perfil ou, sem nome, só o começo do
// e-mail — nunca o e-mail completo.
export function displayName(u: { role: string | null; email: string | null; fullName: string | null }) {
  if (u.role === "teacher") return TEACHER_DISPLAY_NAME;
  if (u.fullName?.trim()) return u.fullName.trim();
  return u.email?.split("@")[0] || "Aluno(a)";
}

export function firstDisplayName(u: { role: string | null; email: string | null; fullName: string | null }) {
  if (u.role === "teacher") return TEACHER_DISPLAY_NAME;
  return displayName(u).split(/\s+/)[0];
}
