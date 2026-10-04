"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { hitung, rupiah } from "@/lib/format";
import type { Transaksi } from "@/lib/types";

const tgl = (s: string) => s.split("-").reverse().join("/");
const HEAD = ["Kode", "Tanggal", "Akun", "Sub Akun", "Kas", "Keterangan 1", "Keterangan 2", "Keterangan 3", "Jumlah", "Harga", "Total"];
const td = "border-r border-slate-100 px-3 py-3 align-top text-slate-900";
const BATCH = 100;

export default function TabelData(p: {
  rows: Transaksi[];
  empty: string;
  highlight?: string;
  selected?: Set<string>;
  onToggle?: (kode: string) => void;
  onToggleAll?: (checked: boolean) => void;
  onDelete?: (t: Transaksi) => void;
  deleteLabel?: string;
}) {
  const [lim, setLim] = useState(BATCH);
  if (p.rows.length === 0) return <p className="p-5 text-sm text-slate-700">{p.empty}</p>;

  const sum = (tipe: string) => p.rows.filter((r) => r.tipe === tipe).reduce((s, r) => s + hitung(r.jumlah, r.harga), 0);
  const masuk = sum("masuk"), keluar = sum("keluar");
  const all = !!p.selected && p.rows.every((r) => p.selected!.has(r.kode));
  const tampil = p.rows.slice(0, lim);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              {p.selected && (
                <th className="w-10 border-r border-slate-200 px-3 py-3">
                  <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={all} aria-label="Pilih semua baris hasil filter"
                    onChange={(e) => p.onToggleAll?.(e.target.checked)} />
                </th>
              )}
              {HEAD.map((h) => <th key={h} className="border-r border-slate-200 px-3 py-3">{h}</th>)}
              {p.onDelete && <th className="px-3 py-3">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tampil.map((t) => (
              <tr key={t.id} className={`transition-colors hover:bg-slate-50 ${p.selected?.has(t.kode) ? "bg-teal-50" : "bg-white"} ${p.highlight === t.id ? "row-new" : ""}`}>
                {p.selected && (
                  <td className={td}>
                    <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={p.selected.has(t.kode)}
                      aria-label={`Pilih ${t.kode}`} onChange={() => p.onToggle?.(t.kode)} />
                  </td>
                )}
                <td className={`${td} whitespace-nowrap font-mono font-semibold text-teal-800`}>{t.kode}</td>
                <td className={`${td} whitespace-nowrap`}>{tgl(t.tanggal)}</td>
                <td className={`${td} font-medium`}>{t.akun}</td>
                <td className={td}>{t.subAkun}</td>
                <td className={td}>{t.kas}</td>
                <td className={td}>{t.ket1 || "-"}</td>
                <td className={td}>{t.ket2 || "-"}</td>
                <td className={td}>{t.ket3 || "-"}</td>
                <td className={`${td} text-right tabular-nums`}>{t.jumlah}</td>
                <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{rupiah(t.harga)}</td>
                <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${t.tipe === "masuk" ? "text-emerald-800" : "text-rose-800"}`}>
                  {t.tipe === "masuk" ? "+" : "−"} {rupiah(hitung(t.jumlah, t.harga))}
                </td>
                {p.onDelete && (
                  <td className="px-2 align-top">
                    <button aria-label={`${p.deleteLabel ?? "Hapus"} ${t.kode}`} title={p.deleteLabel ?? "Hapus"}
                      className="press mt-1 rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700" onClick={() => p.onDelete!(t)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.rows.length > lim && (
        <button onClick={() => setLim((l) => l + BATCH)} className="w-full border-t border-slate-200 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">
          Tampilkan {BATCH} baris lagi ({p.rows.length - lim} tersisa)
        </button>
      )}
      <p className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <span>{p.rows.length} baris</span>
        <span>Pemasukan: <b className="text-emerald-800">{rupiah(masuk)}</b></span>
        <span>Pengeluaran: <b className="text-rose-800">{rupiah(keluar)}</b></span>
        <span>Saldo: <b>{rupiah(masuk - keluar)}</b></span>
      </p>
    </div>
  );
}
