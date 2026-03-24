import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, ReactNode,
} from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Language =
  | "English" | "Spanish" | "French" | "German"
  | "Chinese" | "Arabic" | "Hindi" | "Japanese"
  | "Portuguese" | "Russian";

export const LANGUAGES: Language[] = [
  "English", "Spanish", "French", "German",
  "Chinese", "Arabic", "Hindi", "Japanese", "Portuguese", "Russian",
];

export const LANG_CODE: Record<Language, string> = {
  English: "en", Spanish: "es", French: "fr",  German: "de",
  Chinese: "zh", Arabic: "ar", Hindi:  "hi",   Japanese: "ja",
  Portuguese: "pt", Russian: "ru",
};

export const LANG_FLAG: Record<Language, string> = {
  English: "🇬🇧", Spanish: "🇪🇸", French: "🇫🇷",  German: "🇩🇪",
  Chinese: "🇨🇳", Arabic: "🇸🇦", Hindi:  "🇮🇳",   Japanese: "🇯🇵",
  Portuguese: "🇧🇷", Russian: "🇷🇺",
};

export const RTL_LANGUAGES: Language[] = ["Arabic"];

// ─── Context shape ─────────────────────────────────────────────────────────────

interface LanguageContextValue {
  language:    Language;
  setLanguage: (lang: Language) => void;
  t:           (text: string) => string;
  prime:       (strings: string[]) => void; // eagerly queue strings for translation
  translating: boolean;
  isRTL:       boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "English", setLanguage: () => {},
  t: (s) => s, prime: () => {}, translating: false, isRTL: false,
});

// ─── LocalStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY_LANG  = "app_language";
const STORAGE_KEY_CACHE = "app_translation_cache";

function loadCache(): Record<string, Record<string, string>> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CACHE) ?? "{}"); }
  catch { return {}; }
}

function saveCache(cache: Record<string, Record<string, string>>) {
  try { localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(cache)); }
  catch { localStorage.removeItem(STORAGE_KEY_CACHE); }
}

// ─── Backend call ──────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function translateViaBackend(texts: string[], targetLang: string): Promise<string[]> {
  if (!texts.length) return [];
  try {
    const res = await fetch(`${API_URL}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts, target: targetLang, source: "en" }),
    });
    if (!res.ok) {
      console.error("[i18n] /translate error:", await res.json().catch(() => ({})));
      return texts;
    }
    const data = await res.json();
    return data.translations as string[];
  } catch (e) {
    console.error("[i18n] /translate fetch failed:", e);
    return texts;
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(STORAGE_KEY_LANG) as Language) ?? "English",
  );
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating,  setTranslating]  = useState(false);

  const pendingRef  = useRef<Set<string>>(new Set());
  const flushTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageRef = useRef<Language>(language);

  // Keep ref always current
  useEffect(() => { languageRef.current = language; }, [language]);

  const isRTL    = RTL_LANGUAGES.includes(language);
  const langCode = LANG_CODE[language];

  // RTL + persist
  useEffect(() => {
    document.documentElement.dir  = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = langCode;
    localStorage.setItem(STORAGE_KEY_LANG, language);
  }, [language, isRTL, langCode]);

  // ── Core flush: reads pendingRef, calls backend, updates state + cache ────────
  const flush = useCallback(async () => {
    const currentLang = languageRef.current;
    if (currentLang === "English") return;

    const code   = LANG_CODE[currentLang];
    const cache  = loadCache();
    const cached = cache[code] ?? {};

    const toTranslate = [...pendingRef.current].filter(s => s.trim() && !cached[s]);
    pendingRef.current.clear();

    console.log("[i18n] Flushing:", { lang: currentLang, code, count: toTranslate.length, strings: toTranslate });

    if (!toTranslate.length) {
      console.log("[i18n] All cached, no API call needed");
      return;
    }

    setTranslating(true);
    try {
      const translated = await translateViaBackend(toTranslate, code);

      const newEntries: Record<string, string> = {};
      toTranslate.forEach((orig, i) => { newEntries[orig] = translated[i] ?? orig; });

      saveCache({ ...cache, [code]: { ...cached, ...newEntries } });
      setTranslations(prev => ({ ...prev, ...newEntries }));
    } finally {
      setTranslating(false);
    }
  }, []);

  // ── Debounced schedule — used by t() for lazy registration ───────────────────
  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 80);
  }, [flush]);

  // ── prime() — call this BEFORE render with all known strings ─────────────────
  // Bypasses the t()-registration race entirely
  const prime = useCallback((strings: string[]) => {
    const currentLang = languageRef.current;
    if (currentLang === "English") return;

    const code   = LANG_CODE[currentLang];
    const cached = loadCache()[code] ?? {};

    // Hydrate translations from cache immediately so UI doesn't flash English
    if (Object.keys(cached).length) {
      setTranslations(prev => ({ ...prev, ...cached }));
    }

    // Queue only uncached strings
    strings.forEach(s => {
      if (s.trim() && !cached[s]) pendingRef.current.add(s);
    });

    // Fire immediately — no debounce needed since we're not in a render
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flush, 0);
  }, [flush]);

  // When language changes: hydrate cache + flush pending
  useEffect(() => {
    if (language === "English") {
      setTranslations({});
      return;
    }
    const cached = loadCache()[langCode] ?? {};
    setTranslations(cached);
    // pendingRef will be populated by prime() from the component
  }, [language, langCode]);

  // t() — used in JSX, also registers strings lazily as a fallback
  const t = useCallback(
    (text: string): string => {
      if (!text || language === "English") return text;
      if (translations[text]) return translations[text];

      if (!pendingRef.current.has(text)) {
        pendingRef.current.add(text);
        scheduleFlush();
      }

      return text;
    },
    [translations, language, scheduleFlush],
  );

  const setLanguage = (lang: Language) => {
    pendingRef.current.clear();
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, prime, translating, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useLanguage = () => useContext(LanguageContext);