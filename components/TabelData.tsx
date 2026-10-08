"use client";

import { memo, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { hitung, rupiah } from "@/lib/format";
import type { Transaksi } from "@/lib/types";

const tgl = (s: string) => s.split("-").reverse().join("/");
const HEAD = ["Kode", "Tanggal", "Akun", "Sub Akun", "Kas", "Keterangan 1", "Keterangan 2", "Keterangan 3", "Jumlah", "Harga", "Total"];
const td = "border-r border-slate-100 px-3 py-3 align-top text-slate-900";
const BATCH = 100;

type BarisProps = {
  t: Transaksi;
  checked?: boolean; // undefined = kolom centang tidak tampil
  baru: boolean;
  onToggle?: (kode: string) => void;
  onDelete?: (t: Transaksi) => void;
  deleteLabel: string;
};

// Baris di-memo: hanya baris yang datanya, centangnya, atau sorotannya berubah yang digambar ulang.
const Baris = memo(function Baris({ t, checked, baru, onToggle, onDelete, deleteLabel }: BarisProps) {
  return (
    <tr className={`transition-colors hover:bg-slate-50 ${checked ? "bg-teal-50" : "bg-white"} ${baru ? "row-new" : ""}`}>
      {checked !== undefined && (
        <td className={td}>
          <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={checked}
            aria-label={`Pilih ${t.kode}`} onChange={() => onToggle?.(t.kode)} />
        </td>
      )}
      <td className={`${td} whitespace-nowrap font-mono font-semibold text-teal-800`}
        title={`${t.akun} › ${t.subAkun}${t.ket1 ? ` › ${t.ket1}` : ""}`}>{t.kode}</td>
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
      {onDelete && (
        <td className="px-2 align-top">
          <button aria-label={`${deleteLabel} ${t.kode}`} title={deleteLabel}
            className="press mt-1 rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(t)}>
            <Trash2 size={16} />
          </button>
        </td>
      )}
    </tr>
  );
});

function TabelData(p: {
  rows: readonly Transaksi[];
  empty: string;
  highlight?: string;
  selected?: ReadonlySet<string>;
  onToggle?: (kode: string) => void;
  onToggleAll?: (checked: boolean) => void;
  onDelete?: (t: Transaksi) => void;
  deleteLabel?: string;
}) {
  const [lim, setLim] = useState(BATCH);
  const { rows, selected } = p;

  // Satu kali jalan untuk semua ringkasan
  const ringkas = useMemo(() => {
    let masuk = 0, keluar = 0;
    for (const t of rows) {
      const v = hitung(t.jumlah, t.harga);
      if (t.tipe === "masuk") masuk += v;
      else keluar += v;
    }
    return { masuk, keluar };
  }, [rows]);
  const semua = useMemo(() => !!selected && rows.length > 0 && rows.every((r) => selected.has(r.kode)), [rows, selected]);

  if (rows.length === 0) return <p className="p-5 text-sm text-slate-700">{p.empty}</p>;
  const label = p.deleteLabel ?? "Hapus";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-800">
            <tr>
              {selected && (
                <th className="w-10 border-r border-slate-200 px-3 py-3">
                  <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={semua} aria-label="Pilih semua baris hasil filter"
                    onChange={(e) => p.onToggleAll?.(e.target.checked)} />
                </th>
              )}
              {HEAD.map((h) => <th key={h} className="border-r border-slate-200 px-3 py-3">{h}</th>)}
              {p.onDelete && <th className="px-3 py-3">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, lim).map((t) => (
              <Baris key={t.id} t={t} checked={selected ? selected.has(t.kode) : undefined} baru={p.highlight === t.id}
                onToggle={p.onToggle} onDelete={p.onDelete} deleteLabel={label} />
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > lim && (
        <button onClick={() => setLim((l) => l + BATCH)} className="w-full border-t border-slate-200 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">
          Tampilkan {BATCH} baris lagi ({rows.length - lim} tersisa)
        </button>
      )}
      <p className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <span>{rows.length} baris</span>
        <span>Pemasukan: <b className="text-emerald-800">{rupiah(ringkas.masuk)}</b></span>
        <span>Pengeluaran: <b className="text-rose-800">{rupiah(ringkas.keluar)}</b></span>
        <span>Saldo: <b>{rupiah(ringkas.masuk - ringkas.keluar)}</b></span>
      </p>
    </div>
  );
}
export default memo(TabelData);
