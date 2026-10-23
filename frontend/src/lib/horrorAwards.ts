// Horror Movie Awards (aula de Halloween). Mesmos ids de server/src/modules/awards/routes.ts.
export type AwardCategoryId = "scariest" | "creepiest" | "twist" | "overrated" | "halloween";

export interface AwardCategory {
  id: AwardCategoryId;
  title: string;
  /** Rótulo do campo "Outro" — personagem em vez de filme na categoria creepiest. */
  otherLabel: string;
  nominees: string[];
  starters: string[];
}

export const AWARD_CATEGORIES: AwardCategory[] = [
  {
    id: "scariest",
    title: "The Scariest Movie Ever",
    otherLabel: "Another movie",
    nominees: ["The Exorcist", "Hereditary", "The Conjuring", "The Ring", "Sinister", "It"],
    starters: ["It gave me nightmares because…", "The scariest scene is when…", "I couldn't sleep after…"],
  },
  {
    id: "creepiest",
    title: "The Creepiest Horror Character",
    otherLabel: "Another character",
    nominees: ["Pennywise", "Samara", "Freddy Krueger", "Chucky", "Annabelle", "Michael Myers"],
    starters: ["… gives me the creeps because…", "He/She sends shivers down my spine when…"],
  },
  {
    id: "twist",
    title: "The Best Plot Twist",
    otherLabel: "Another movie",
    nominees: ["The Sixth Sense", "The Others", "Get Out", "Saw", "Orphan", "Psycho"],
    starters: ["I didn't see it coming because…", "It made me want to watch it again because…"],
  },
  {
    id: "overrated",
    title: "The Most Overrated Horror Movie",
    otherLabel: "Another movie",
    nominees: ["The Blair Witch Project", "Paranormal Activity", "Midsommar", "The Nun", "Annabelle", "The Babadook"],
    starters: ["I don't get the hype because…", "It's not as scary as people say because…"],
  },
  {
    id: "halloween",
    title: "The Best Movie to Watch on Halloween",
    otherLabel: "Another movie",
    nominees: ["Halloween (1978)", "Hocus Pocus", "Scream", "Beetlejuice", "Trick 'r Treat", "The Nightmare Before Christmas"],
    starters: ["It's a must-watch on Halloween because…", "It's perfect for a movie night because…"],
  },
];

// Igual ao normalize do servidor: "the ring!" e "The Ring" são o mesmo indicado.
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "");
}

/** Se o que o aluno escreveu bate com um indicado da lista, mostra com a grafia da lista. */
export function nomineeLabel(category: AwardCategory, label: string) {
  const key = normalize(label);
  return category.nominees.find((n) => normalize(n) === key) ?? label;
}

export interface AwardsResults {
  open: boolean;
  voters: { name: string; updatedAt: string }[];
  categories: {
    id: AwardCategoryId;
    results: { label: string; count: number; voters: { name: string; reason: string }[] }[];
  }[];
}
