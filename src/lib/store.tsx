import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type AiKey, type AiVault, type Settings } from "../types";

const FAV_KEY = "stocklens.favourites";
const FOL_KEY = "stocklens.follows";
const SET_KEY = "stocklens.settings";
const REC_KEY = "stocklens.recent";
const SEEN_KEY = "stocklens.seenNews";
const AI_KEY = "stocklens.aikeys";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const EMPTY_VAULT: AiVault = { activeId: null, keys: [] };

interface Store {
  favourites: string[];
  follows: string[];
  recent: string[];
  settings: Settings;
  toggleFavourite: (symbol: string) => void;
  toggleFollow: (symbol: string) => void;
  isFavourite: (symbol: string) => boolean;
  isFollowed: (symbol: string) => boolean;
  addRecent: (symbol: string) => void;
  removeRecent: (symbol: string) => void;
  clearRecent: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  seenNews: string[];
  markNewsSeen: (ids: string[]) => void;
  aiVault: AiVault;
  activeAiKey: AiKey | null;
  upsertAiKey: (entry: AiKey) => void;
  removeAiKey: (id: string) => void;
  setActiveAiKey: (id: string | null) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [favourites, setFavourites] = useState<string[]>(() => readJson(FAV_KEY, []));
  const [follows, setFollows] = useState<string[]>(() => readJson(FOL_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => readJson(REC_KEY, []));
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJson(SET_KEY, {}),
  }));
  const [seenNews, setSeenNews] = useState<string[]>(() => readJson(SEEN_KEY, []));
  const [aiVault, setAiVault] = useState<AiVault>(() => {
    const raw = readJson<Partial<AiVault>>(AI_KEY, EMPTY_VAULT);
    return {
      activeId: typeof raw.activeId === "string" ? raw.activeId : null,
      keys: Array.isArray(raw.keys) ? raw.keys.filter((k) => k && typeof k.id === "string" && typeof k.key === "string") : [],
    };
  });

  useEffect(() => localStorage.setItem(FAV_KEY, JSON.stringify(favourites)), [favourites]);
  useEffect(() => localStorage.setItem(FOL_KEY, JSON.stringify(follows)), [follows]);
  useEffect(() => localStorage.setItem(REC_KEY, JSON.stringify(recent)), [recent]);
  useEffect(() => localStorage.setItem(SET_KEY, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(SEEN_KEY, JSON.stringify(seenNews.slice(-400))), [seenNews]);
  useEffect(() => localStorage.setItem(AI_KEY, JSON.stringify(aiVault)), [aiVault]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    const theme = settings.darkMode ? "#0B1016" : "#F3F5F7";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme);
  }, [settings.darkMode]);

  const toggleFavourite = useCallback((symbol: string) => {
    const s = symbol.toUpperCase();
    setFavourites((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [s, ...prev]));
  }, []);

  const toggleFollow = useCallback((symbol: string) => {
    const s = symbol.toUpperCase();
    setFollows((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [s, ...prev]));
  }, []);

  const addRecent = useCallback((symbol: string) => {
    const s = symbol.toUpperCase();
    setRecent((prev) => {
      if (prev[0] === s) return prev;
      return [s, ...prev.filter((x) => x !== s)].slice(0, 8);
    });
  }, []);

  const removeRecent = useCallback((symbol: string) => {
    const s = symbol.toUpperCase();
    setRecent((prev) => prev.filter((x) => x !== s));
  }, []);

  const clearRecent = useCallback(() => setRecent([]), []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const markNewsSeen = useCallback((ids: string[]) => {
    setSeenNews((prev) => {
      const set = new Set(prev);
      let changed = false;
      ids.forEach((id) => {
        if (!set.has(id)) {
          set.add(id);
          changed = true;
        }
      });
      return changed ? [...set] : prev;
    });
  }, []);

  const upsertAiKey = useCallback((entry: AiKey) => {
    setAiVault((prev) => {
      const keys = prev.keys.some((k) => k.id === entry.id)
        ? prev.keys.map((k) => (k.id === entry.id ? entry : k))
        : [...prev.keys, entry];
      return { keys, activeId: prev.activeId || entry.id };
    });
  }, []);

  const removeAiKey = useCallback((id: string) => {
    setAiVault((prev) => {
      const keys = prev.keys.filter((k) => k.id !== id);
      const activeId = prev.activeId === id ? keys[0]?.id || null : prev.activeId;
      return { keys, activeId };
    });
  }, []);

  const setActiveAiKey = useCallback((id: string | null) => {
    setAiVault((prev) => ({ ...prev, activeId: id }));
  }, []);

  const isFavourite = useCallback((symbol: string) => favourites.includes(symbol.toUpperCase()), [favourites]);
  const isFollowed = useCallback((symbol: string) => follows.includes(symbol.toUpperCase()), [follows]);
  const activeAiKey = useMemo(
    () => aiVault.keys.find((k) => k.id === aiVault.activeId) || null,
    [aiVault]
  );

  const value = useMemo<Store>(
    () => ({
      favourites,
      follows,
      recent,
      settings,
      seenNews,
      toggleFavourite,
      toggleFollow,
      isFavourite,
      isFollowed,
      addRecent,
      removeRecent,
      clearRecent,
      updateSettings,
      markNewsSeen,
      aiVault,
      activeAiKey,
      upsertAiKey,
      removeAiKey,
      setActiveAiKey,
    }),
    [
      favourites,
      follows,
      recent,
      settings,
      seenNews,
      toggleFavourite,
      toggleFollow,
      isFavourite,
      isFollowed,
      addRecent,
      removeRecent,
      clearRecent,
      updateSettings,
      markNewsSeen,
      aiVault,
      activeAiKey,
      upsertAiKey,
      removeAiKey,
      setActiveAiKey,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Store missing");
  return ctx;
}
