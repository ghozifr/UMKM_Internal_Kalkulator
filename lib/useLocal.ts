"use client";
import { useEffect, useRef, useState } from "react";

const TUNDA = 300;

const simpan = (key: string, v: unknown) => {
  try {
    const s = JSON.stringify(v);
    if (localStorage.getItem(key) !== s) localStorage.setItem(key, s); // lewati jika tidak berubah
  } catch {}
};

// State yang tersimpan di browser (localStorage) dan tersinkron antar-tab.
// Penulisan ditunda 300 ms agar perubahan beruntun hanya menulis sekali,
// dan langsung dituntaskan saat tab ditutup atau disembunyikan.
export function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  const [ready, setReady] = useState(false);
  const tunggu = useRef<{ t: ReturnType<typeof setTimeout>; v: T } | null>(null);

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
    const tuntaskan = () => {
      const w = tunggu.current;
      if (!w) return;
      clearTimeout(w.t);
      tunggu.current = null;
      simpan(key, w.v);
    };
    const sembunyi = () => document.visibilityState === "hidden" && tuntaskan();
    window.addEventListener("storage", sync);
    window.addEventListener("pagehide", tuntaskan);
    document.addEventListener("visibilitychange", sembunyi);
    return () => {
      tuntaskan();
      window.removeEventListener("storage", sync);
      window.removeEventListener("pagehide", tuntaskan);
      document.removeEventListener("visibilitychange", sembunyi);
    };
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    if (tunggu.current) clearTimeout(tunggu.current.t);
    const t = setTimeout(() => {
      tunggu.current = null;
      simpan(key, v);
    }, TUNDA);
    tunggu.current = { t, v };
  }, [key, v, ready]);

  return [v, setV, ready] as const;
}
