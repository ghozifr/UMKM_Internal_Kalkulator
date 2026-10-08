"use client";

import { memo, useMemo } from "react";
import { Download, Trash2 } from "lucide-react";
import { barisTurunan } from "@/lib/tabel";
import type { Transaksi, Turunan } from "@/lib/types";
import { Lbl, box, btn, card } from "./ui";
import TabelData from "./TabelData";

type Props = {
  turunan: Turunan[];
  byKode: ReadonlyMap<string, Transaksi>;
  aktif: string;
  onAktif: (id: string) => void;
  onRename: (id: string, nama: string) => void;
  onKeluarkan: (id: string, kode: string) => void;
  onHapus: (id: string) => void;
};

function TabTurunan({ turunan, byKode, aktif, onAktif, onRename, onKeluarkan, onHapus }: Props) {
  const at = turunan.find((t) => t.id === aktif) ?? turunan[0];
  const rows = useMemo(() => (at ? barisTurunan(at, byKode) : []), [at, byKode]);

  return (
    <section className={`overflow-hidden ${card}`}>
      <div className="border-b border-slate-300 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Tabel Turunan</h2>
        <p className="text-sm text-slate-700">Tabel buatan Anda sendiri dari baris pilihan di Tabel Induk. Setiap tabel hanya menyimpan Kode barisnya, jadi datanya selalu mengikuti Tabel Induk.</p>
        {turunan.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {turunan.map((t) => (
              <button key={t.id} onClick={() => onAktif(t.id)} aria-pressed={t.id === at?.id}
                className={`press rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${t.id === at?.id ? "border-teal-700 bg-teal-700 text-white" : "border-slate-400 bg-white text-slate-800 hover:bg-slate-100"}`}>
                {t.nama} ({t.id === at?.id ? rows.length : t.kodes.length})
              </button>
            ))}
          </div>
        )}
      </div>

      {!at ? (
        <p className="p-5 text-sm text-slate-700">
          Belum ada Tabel Turunan. Buka tab <b>Tabel Induk</b>, saring dan centang baris yang diperlukan, lalu klik <b>Buat Tabel Turunan</b>.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-300 bg-slate-50 p-4 sm:px-6">
            <Lbl t="Nama tabel" cls="min-w-[220px] flex-1">
              <input key={at.id} className={box} defaultValue={at.nama}
                onBlur={(e) => { const v = e.target.value.trim(); if (v) onRename(at.id, v); else e.target.value = at.nama; }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
            </Lbl>
            <button className={btn} onClick={async () => {
              const { exportExcel } = await import("@/lib/exportExcel");
              await exportExcel([{ nama: at.nama, rows }], `${at.nama}.xlsx`);
            }}><Download size={16} /> Unduh Excel</button>
            <button className="press inline-flex items-center gap-2 rounded-xl border border-rose-700 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50"
              onClick={() => confirm(`Hapus tabel "${at.nama}"? Data di Tabel Induk tidak terhapus.`) && onHapus(at.id)}>
              <Trash2 size={16} /> Hapus Tabel
            </button>
          </div>
          <TabelData rows={rows} deleteLabel="Keluarkan dari tabel ini" onDelete={(r) => onKeluarkan(at.id, r.kode)}
            empty="Tabel ini kosong karena baris-barisnya sudah dihapus dari Tabel Induk." />
        </>
      )}
    </section>
  );
}
export default memo(TabTurunan);
