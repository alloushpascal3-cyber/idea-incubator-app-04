import { useCallback, useEffect, useState } from "react";

import { DEFAULT_SETTINGS, type Settings } from "./scalping-types";

const KEY = "scalping-settings-v1";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          weights: { ...DEFAULT_SETTINGS.weights, ...(parsed.weights ?? {}) },
          indicators: { ...DEFAULT_SETTINGS.indicators, ...(parsed.indicators ?? {}) },
        });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  return { settings, update, reset, loaded };
}