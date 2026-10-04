"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function Modal(p: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  const tutup = useRef(p.onClose);
  tutup.current = p.onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && tutup.current();
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = lama; };
  }, []);

  return (
    <div className="anim-fade fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div role="dialog" aria-modal="true" aria-label={p.title}
        className="anim-pop max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{p.title}</h2>
            {p.subtitle && <p className="text-sm text-slate-700">{p.subtitle}</p>}
          </div>
          <button onClick={p.onClose} aria-label="Tutup" className="press rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"><X size={20} /></button>
        </header>
        {p.children}
      </div>
    </div>
  );
}
