"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { rupiah } from "@/lib/format";
import type { Opsi } from "@/lib/types";

export const box =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";
export const btn =
  "press inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none";
export const btn2 =
  "press inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:text-slate-500";
export const card =
  "anim-up rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.08),0_10px_28px_-14px_rgba(15,23,42,.15)]";

export function Lbl(p: { t: string; children: ReactNode; cls?: string }) {
  return (
    <label className={`block ${p.cls ?? ""}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{p.t}</span>
      {p.children}
    </label>
  );
}

export function Seksi(p: { n: number; t: string; children: ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{p.n}</span>
        {p.t}
      </h3>
      {p.children}
    </div>
  );
}

// Dropdown dengan tombol "Kelola" untuk menambah, mengubah, dan menghapus pilihan.
export function Pilih(p: {
  label: string; value: string; options: readonly Opsi[]; onChange: (v: string) => void;
  onKelola: () => void; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{p.label}</span>
        <button type="button" onClick={p.onKelola} disabled={p.disabled}
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline">
          <Settings2 size={14} /> Kelola
        </button>
      </div>
      <select className={box} value={p.value} disabled={p.disabled} onChange={(e) => p.onChange(e.target.value)} aria-label={p.label}>
        <option value="">{p.disabled ? p.hint : `Pilih ${p.label}`}</option>
        {p.options.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
      </select>
    </div>
  );
}

// Angka yang bergerak halus saat nilainya berubah (menghormati prefers-reduced-motion).
function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const dari = useRef(target);
  useEffect(() => {
    const a = dari.current;
    if (a === target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { dari.current = target; setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const cur = a + (target - a) * (1 - Math.pow(1 - k, 3));
      dari.current = cur;
      setV(cur);
      if (k < 1) raf = requestAnimationFrame(tick);
      else dari.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
export function Angka({ v }: { v: number }) {
  return <p className="text-xl font-bold tabular-nums text-slate-900">{rupiah(useCountUp(v))}</p>;
}
