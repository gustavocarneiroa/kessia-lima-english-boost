import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type GroupType = "individual" | "duo" | "trio";
export type Shift = "day" | "night";
export type DurationMonths = 3 | 6 | 9 | 12;

export interface Pricing {
  day: Record<GroupType, number>;
  night: Record<GroupType, number>;
  nightStartsAt: string; // "HH:MM"
  durationDiscounts: Record<"3" | "6" | "9" | "12", number>;
}

// Mesmo padrão do servidor (server/src/lib/pricing.ts) — usado enquanto carrega ou se o
// servidor estiver fora do ar, pra landing page nunca ficar sem preço.
export const DEFAULT_PRICING: Pricing = {
  day: { individual: 70, duo: 63, trio: 56 },
  night: { individual: 90, duo: 81, trio: 72 },
  nightStartsAt: "18:00",
  durationDiscounts: { "3": 0, "6": 5, "9": 10, "12": 15 },
};

export const DURATIONS: DurationMonths[] = [3, 6, 9, 12];

// Nomes dos planos da landing page, por duração.
export const PLAN_NAMES: Record<DurationMonths, string> = { 3: "Start", 6: "Progress", 9: "Advance", 12: "Master" };

export async function fetchPricing(): Promise<Pricing> {
  const res = await api.get<{ pricing: Pricing }>("/api/pricing");
  return res.pricing;
}

export function usePricing() {
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPricing()
      .then((p) => !cancelled && setPricing(p))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return { pricing, setPricing, loaded };
}
