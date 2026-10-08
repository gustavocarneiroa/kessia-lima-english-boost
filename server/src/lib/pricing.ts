import { z } from "zod";
import { getSetting, setSetting } from "./settings.ts";

const PRICING_SETTING = "pricing";

// Valor da hora/aula por pessoa, em reais. "day" = manhã/tarde, "night" = noite
// (mesmo seletor "dia/noite" da seção de preços da landing page).
const hourlyRates = z.object({
  individual: z.number().positive().max(10_000),
  duo: z.number().positive().max(10_000),
  trio: z.number().positive().max(10_000),
});

export const pricingSchema = z.object({
  day: hourlyRates,
  night: hourlyRates,
  // A partir de que horário a aula conta como "noite", "HH:MM".
  nightStartsAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  // Desconto (%) por duração do contrato, em meses — os planos Start/Progress/Advance/Master.
  durationDiscounts: z.object({
    "3": z.number().min(0).max(100),
    "6": z.number().min(0).max(100),
    "9": z.number().min(0).max(100),
    "12": z.number().min(0).max(100),
  }),
});

export type Pricing = z.infer<typeof pricingSchema>;

// Padrão = valores que estavam fixos na landing page (R$ 840 por 12 aulas de manhã,
// R$ 1.080 à noite, 5/10/15% nos planos de 6/9/12 meses). Dupla e trio não aparecem
// na landing — seguem a mesma proporção do orçamento antigo (90% e 80% da individual).
export const DEFAULT_PRICING: Pricing = {
  day: { individual: 70, duo: 63, trio: 56 },
  night: { individual: 90, duo: 81, trio: 72 },
  nightStartsAt: "18:00",
  durationDiscounts: { "3": 0, "6": 5, "9": 10, "12": 15 },
};

export function getPricing(): Pricing {
  const raw = getSetting(PRICING_SETTING);
  if (!raw) return DEFAULT_PRICING;
  try {
    const parsed = pricingSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}

export function setPricing(pricing: Pricing): void {
  setSetting(PRICING_SETTING, JSON.stringify(pricing));
}
