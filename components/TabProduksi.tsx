"use client";

import { memo, useMemo, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { angkaKet2, bulat4 } from "@/lib/persediaan";
import type { Opsi, Transaksi } from "@/lib/types";
import { btn, btn2, card } from "./ui";
import TabelData from "./TabelData";

type Props = { opsi: Opsi[]; trx: Transaksi[]; baru: string; onHapus: (t: Transaksi) => void };
const angka = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(n);

// Setiap Akun Produksi otomatis punya tabel produksinya sendiri, plus total per produk (Keterangan 1).
function TabProduksi({ opsi, trx, baru, onHapus }: Props) {
  const akuns = useMemo(() => opsi.filter((o) => o.level === "akun" && o.produksi), [opsi]);
  const [aktif, setAktif] = useState("");
  const [bulan, setBulan] = useState("");
  const a = akuns.find((x) => x.id === aktif) ?? akuns[0];

  const rows = useMemo(
    () => (a ? trx.filter((t) => t.aid === a.id && (!bulan || t.tanggal.startsWith(bulan))) : []),
    [a, trx, bulan],
  );
  const { per, salah } = useMemo(() => {
    const m = new Map<string, { jumlah: number; baris: number }>();
    let salah = 0;
    for (const t of rows) {
      const q = angkaKet2(t.ket2);
      if (q === null || q <= 0) { salah++; continue; }
      const k = t.ket1.trim() || "(tanpa Keterangan 1)";
      const c = m.get(k) ?? { jumlah: 0, baris: 0 };
      c.jumlah += q; c.baris++;
      m.set(k, c);
    }
    return { per: [...m].sort((x, y) => y[1].jumlah - x[1].jumlah), salah };
  }, [rows]);

  const unduh = async () => {
    if (!a) return;
    const { exportExcel } = await import("@/lib/exportExcel");
    await exportExcel([{ nama: a.nama, rows }], `Produksi - ${a.nama}${bulan ? ` ${bulan}` : ""}.xlsx`);
  };

  if (!a) return null;
  return (
    <section className={`overflow-hidden ${card}`}>
      <div className="border-b border-slate-300 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Tabel Produksi</h2>
        <p className="text-sm text-slate-700">Semua transaksi Akun Produksi. Keterangan 1 adalah produk, Keterangan 2 jumlah produksi, Keterangan 3 jenis pengerjaan.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {akuns.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {akuns.map((x) => (
                <button key={x.id} onClick={() => setAktif(x.id)} aria-pressed={x.id === a.id}
                  className={`press rounded-full border px-4 py-1.5 text-sm font-semibold ${x.id === a.id ? "border-teal-700 bg-teal-700 text-white" : "border-slate-400 bg-white text-slate-800 hover:bg-slate-100"}`}>
                  {x.nama}
                </button>
              ))}
            </div>
          )}
          <label className="text-sm font-semibold text-slate-800">
            Bulan
            <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
              className="ml-2 rounded-xl border border-slate-400 bg-white px-3 py-2 text-sm font-normal text-slate-900" />
          </label>
          {bulan && <button className={btn2} onClick={() => setBulan("")}>Semua bulan</button>}
        </div>
      </div>

      <div className="border-b border-slate-300 bg-slate-50 p-4 sm:px-6">
        <h3 className="mb-2 text-sm font-bold text-slate-900">Total produksi per produk{bulan ? ` (${bulan})` : ""}</h3>
        {per.length === 0 ? <p className="text-sm text-slate-700">Belum ada produksi yang bisa dijumlahkan.</p> : (
          <ul className="flex flex-wrap gap-2">
            {per.map(([nama, v]) => (
              <li key={nama} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-300">
                <span className="font-semibold text-slate-900">{nama}</span>{" "}
                <span className="tabular-nums font-bold text-teal-800">{angka(bulat4(v.jumlah))}</span>
                <span className="text-slate-600"> · {v.baris} baris</span>
              </li>
            ))}
          </ul>
        )}
        {salah > 0 && (
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {salah} baris Keterangan 2-nya bukan angka, jadi tidak ikut dijumlahkan. Perbaiki lewat hapus lalu catat ulang.</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-slate-300 p-4 sm:px-6">
        <p className="text-sm text-slate-700">{rows.length} baris{bulan ? ` pada ${bulan}` : ""}</p>
        <button className={rows.length ? btn : btn2} disabled={!rows.length} onClick={unduh}><Download size={16} /> Unduh Excel</button>
      </div>
      <TabelData rows={rows} highlight={baru} onDelete={onHapus} empty="Belum ada transaksi produksi. Pilih Akun produksi di tab Catat lalu simpan." />
    </section>
  );
}
export default memo(TabProduksi);
