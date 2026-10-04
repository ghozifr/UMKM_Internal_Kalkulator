"use client";
import { useEffect, useState } from "react";

// State yang otomatis tersimpan di browser (localStorage) dan
// tersinkron antar-tab browser yang membuka aplikasi yang sama.
export function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s) setV(JSON.parse(s));
    } catch {}
    setReady(true);
    const sync = (e: StorageEvent) => {
      if (e.key !== key || !e.newValue) return;
      try { setV(JSON.parse(e.newValue)); } catch {}
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v, ready]);
  return [v, setV] as const;
}
