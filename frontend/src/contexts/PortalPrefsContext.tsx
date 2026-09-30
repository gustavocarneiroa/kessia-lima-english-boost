import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Preferências de exibição do portal (idioma e tema), guardadas neste aparelho.

export type PortalLang = "pt" | "en";
export type PortalTheme = "light" | "dark";
export type TFn = (pt: string, en: string) => string;

interface PortalPrefsValue {
  lang: PortalLang;
  setLang: (lang: PortalLang) => void;
  theme: PortalTheme;
  setTheme: (theme: PortalTheme) => void;
  /** Escolhe o texto no idioma atual: t("Salvar", "Save"). */
  t: (pt: string, en: string) => string;
  /** Locale pra formatar datas e números ("pt-BR" ou "en-US"). */
  locale: string;
}

const LANG_KEY = "portal.lang";
const THEME_KEY = "portal.theme";

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sem armazenamento (aba anônima etc.) — só não lembra da escolha
  }
}

const PortalPrefsContext = createContext<PortalPrefsValue | null>(null);

export function PortalPrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<PortalLang>(() => readPref(LANG_KEY, ["pt", "en"] as const, "pt"));
  const [theme, setThemeState] = useState<PortalTheme>(() => readPref(THEME_KEY, ["light", "dark"] as const, "light"));

  // O tema escuro vale só enquanto o portal está aberto — o site público continua claro.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang === "en" ? "en" : "pt-BR";
    return () => {
      root.lang = previous;
    };
  }, [lang]);

  const setLang = (l: PortalLang) => {
    setLangState(l);
    writePref(LANG_KEY, l);
  };
  const setTheme = (th: PortalTheme) => {
    setThemeState(th);
    writePref(THEME_KEY, th);
  };

  const t = (pt: string, en: string) => (lang === "en" ? en : pt);
  const locale = lang === "en" ? "en-US" : "pt-BR";

  return (
    <PortalPrefsContext.Provider value={{ lang, setLang, theme, setTheme, t, locale }}>
      {children}
    </PortalPrefsContext.Provider>
  );
}

// Fora do portal (ex.: componente compartilhado usado no site público) cai no padrão: português, tema claro.
const FALLBACK: PortalPrefsValue = {
  lang: "pt",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
  t: (pt) => pt,
  locale: "pt-BR",
};

export function usePortalPrefs() {
  return useContext(PortalPrefsContext) ?? FALLBACK;
}
