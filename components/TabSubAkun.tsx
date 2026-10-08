"use client";

import { memo, useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { kelompokSub, type Grup } from "@/lib/tabel";
import type { Level, Opsi, Transaksi } from "@/lib/types";
import { btn, btn2, card } from "./ui";
import TabelData from "./TabelData";

type Props = {
  opsi: Opsi[];
  trx: Transaksi[];
  baru: string;
  onHapus: (t: Transaksi) => void;
  onKelola: (level: Level, parentId?: string) => void;
};

function Chip({ g, aktif, onPilih }: { g: Grup; aktif: boolean; onPilih: () => void }) {
  return (
    <button onClick={onPilih} aria-pressed={aktif}
      className={`press inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${aktif ? "border-teal-700 bg-teal-700 text-white" : "border-slate-400 bg-white text-slate-800 hover:bg-slate-100"}`}>
      {g.nama}
      <span className={`rounded-full px-2 text-xs ${aktif ? "bg-white/25" : "bg-slate-200 text-slate-800"}`}>{g.rows.length}</span>
    </button>
  );
}

// Setiap Sub Akun otomatis punya tabelnya sendiri. Sub Akun baru langsung muncul di sini.
function TabSubAkun({ opsi, trx, baru, onHapus, onKelola }: Props) {
  const grup = useMemo(() => kelompokSub(opsi, trx), [opsi, trx]);
  const akuns = useMemo(() => opsi.filter((o) => o.level === "akun"), [opsi]);
  const [aktif, setAktif] = useState("");
  const g = grup.find((x) => x.key === aktif) ?? grup[0];
  const arsip = grup.filter((x) => x.arsip);

  const unduh = async () => {
    if (!g) return;
    const { exportExcel } = await import("@/lib/exportExcel");
    await exportExcel([{ nama: g.nama, rows: g.rows }], `${g.akun} - ${g.nama}.xlsx`);
  };

  return (
    <section className={`overflow-hidden ${card}`}>
      <div className="border-b border-slate-300 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Tabel per Sub Akun</h2>
        <p className="text-sm text-slate-700">Setiap Sub Akun otomatis punya tabelnya sendiri. Buat Sub Akun baru, dan tabelnya langsung muncul di sini.</p>

        <div className="mt-4 space-y-4">
          {akuns.length === 0 && <p className="text-sm text-slate-700">Belum ada Akun. Tambahkan lewat tombol Kelola di tab Catat Transaksi.</p>}
          {akuns.map((a) => (
            <div key={a.id}>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                {a.nama}
                <span className={`rounded-md px-2 py-0.5 text-xs ${a.tipe === "masuk" ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>
                  {a.tipe === "masuk" ? "uang masuk" : "uang keluar"}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {grup.filter((x) => x.akunId === a.id).map((x) => <Chip key={x.key} g={x} aktif={x.key === g?.key} onPilih={() => setAktif(x.key)} />)}
                <button onClick={() => onKelola("subAkun", a.id)}
                  className="press inline-flex items-center gap-1 rounded-full border border-dashed border-teal-700 px-4 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50">
                  <Plus size={14} /> Sub Akun
                </button>
              </div>
            </div>
          ))}
          {arsip.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Sub Akun yang sudah dihapus</p>
              <div className="flex flex-wrap gap-2">
                {arsip.map((x) => <Chip key={x.key} g={x} aktif={x.key === g?.key} onPilih={() => setAktif(x.key)} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {g ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 p-4 sm:px-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">{g.nama}</h3>
              <p className="text-sm text-slate-700">
                Akun {g.akun}{g.prefix ? `, awalan kode ${g.prefix}` : ""}{g.arsip ? ", sudah dihapus dari daftar pilihan" : ""}
              </p>
            </div>
            <button className={g.rows.length ? btn : btn2} disabled={!g.rows.length} onClick={unduh}><Download size={16} /> Unduh Excel</button>
          </div>
          <TabelData rows={g.rows} highlight={baru} onDelete={onHapus} empty="Belum ada transaksi di Sub Akun ini. Catat transaksi dengan Sub Akun ini dan barisnya muncul di sini." />
        </>
      ) : (
        akuns.length > 0 && <p className="p-5 text-sm text-slate-700">Belum ada Sub Akun. Klik tombol Sub Akun di atas untuk membuat yang pertama.</p>
      )}
    </section>
  );
}
export default memo(TabSubAkun);
