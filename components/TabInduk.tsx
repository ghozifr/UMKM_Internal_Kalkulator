"use client";

import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { Download, FilePlus2, FilterX } from "lucide-react";
import { kelompokSub, barisTurunan } from "@/lib/tabel";
import type { Opsi, Transaksi, Turunan } from "@/lib/types";
import { Lbl, box, btn, btn2, card } from "./ui";
import TabelData from "./TabelData";

const F0 = { q: "", dari: "", sampai: "", akun: "", subAkun: "", kas: "", ket1: "", ket2: "", ket3: "" };
const SEL = [["akun", "Akun"], ["subAkun", "Sub Akun"], ["kas", "Kas"], ["ket1", "Keterangan 1"]] as const;
const KOSONG: Transaksi[] = [];
const haystack = (t: Transaksi) => `${t.kode} ${t.akun} ${t.subAkun} ${t.kas} ${t.ket1} ${t.ket2} ${t.ket3}`.toLowerCase();

type Props = {
  trx: Transaksi[];
  turunan: Turunan[];
  opsi: Opsi[];
  byKode: ReadonlyMap<string, Transaksi>;
  baru: string;
  onHapus: (t: Transaksi) => void;
  onBuat: (nama: string, kodes: string[]) => void;
};

function TabInduk({ trx, turunan, opsi, byKode, baru, onHapus, onBuat }: Props) {
  const [fl, setFl] = useState(F0);
  const [pilih, setPilih] = useState<ReadonlySet<string>>(new Set());
  const [namaT, setNamaT] = useState("");
  const f = useDeferredValue(fl); // mengetik tetap lancar walau datanya ribuan

  // Teks pencarian dibuat sekali per perubahan data, bukan per ketikan
  const hay = useMemo(() => trx.map(haystack), [trx]);
  const pilihan = useMemo(() => {
    const s = { akun: new Set<string>(), subAkun: new Set<string>(), kas: new Set<string>(), ket1: new Set<string>() };
    for (const t of trx) {
      s.akun.add(t.akun); s.subAkun.add(t.subAkun); s.kas.add(t.kas);
      if (t.ket1) s.ket1.add(t.ket1);
    }
    const urut = (x: Set<string>) => [...x].sort((a, b) => a.localeCompare(b, "id"));
    return { akun: urut(s.akun), subAkun: urut(s.subAkun), kas: urut(s.kas), ket1: urut(s.ket1) };
  }, [trx]);

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase(), k2 = f.ket2.trim().toLowerCase(), k3 = f.ket3.trim().toLowerCase();
    const out: Transaksi[] = [];
    for (let i = 0; i < trx.length; i++) {
      const t = trx[i];
      if (q && !hay[i].includes(q)) continue;
      if (f.dari && t.tanggal < f.dari) continue;
      if (f.sampai && t.tanggal > f.sampai) continue;
      if (f.akun && t.akun !== f.akun) continue;
      if (f.subAkun && t.subAkun !== f.subAkun) continue;
      if (f.kas && t.kas !== f.kas) continue;
      if (f.ket1 && t.ket1 !== f.ket1) continue;
      if (k2 && !t.ket2.toLowerCase().includes(k2)) continue;
      if (k3 && !t.ket3.toLowerCase().includes(k3)) continue;
      out.push(t);
    }
    return out;
  }, [trx, hay, f]);

  const toggle = useCallback((k: string) => setPilih((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  }), []);
  const toggleAll = useCallback((c: boolean) => setPilih((s) => {
    const n = new Set(s);
    for (const t of filtered) {
      if (c) n.add(t.kode);
      else n.delete(t.kode);
    }
    return n;
  }), [filtered]);

  // Hanya baris yang masih ada di Tabel Induk yang dihitung
  const terpilih = useMemo(() => (pilih.size ? trx.filter((t) => pilih.has(t.kode)) : KOSONG), [trx, pilih]);

  const buat = () => {
    if (!terpilih.length || !namaT.trim()) return;
    onBuat(namaT.trim(), terpilih.map((t) => t.kode));
    setPilih(new Set());
    setNamaT("");
  };

  const unduh = async () => {
    const { exportExcel } = await import("@/lib/exportExcel");
    await exportExcel([
      { nama: "Tabel Induk", rows: trx },
      ...kelompokSub(opsi, trx).filter((g) => g.rows.length).map((g) => ({ nama: g.nama, rows: g.rows })),
      ...turunan.map((t) => ({ nama: t.nama, rows: barisTurunan(t, byKode) })),
    ], "Buku-Kas.xlsx");
  };

  return (
    <section className={`overflow-hidden ${card}`}>
      <div className="border-b border-slate-300 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tabel Induk</h2>
            <p className="text-sm text-slate-700">Semua transaksi ada di sini. Saring data, centang baris berdasarkan Kode, lalu buat Tabel Turunan.</p>
          </div>
          <button className={btn} disabled={!trx.length} onClick={unduh}><Download size={16} /> Unduh Excel</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Lbl t="Cari (kode atau teks)" cls="lg:col-span-2">
            <input className={box} placeholder="Contoh: PEN-PBB atau Pisang" value={fl.q} onChange={(e) => setFl({ ...fl, q: e.target.value })} />
          </Lbl>
          <Lbl t="Dari tanggal"><input type="date" className={box} value={fl.dari} onChange={(e) => setFl({ ...fl, dari: e.target.value })} /></Lbl>
          <Lbl t="Sampai tanggal"><input type="date" className={box} value={fl.sampai} onChange={(e) => setFl({ ...fl, sampai: e.target.value })} /></Lbl>
          {SEL.map(([k, label]) => (
            <Lbl key={k} t={label}>
              <select className={box} value={fl[k]} onChange={(e) => setFl({ ...fl, [k]: e.target.value })}>
                <option value="">Semua</option>
                {pilihan[k].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Lbl>
          ))}
          <Lbl t="Keterangan 2 mengandung"><input className={box} value={fl.ket2} onChange={(e) => setFl({ ...fl, ket2: e.target.value })} /></Lbl>
          <Lbl t="Keterangan 3 mengandung"><input className={box} value={fl.ket3} onChange={(e) => setFl({ ...fl, ket3: e.target.value })} /></Lbl>
          <div className="flex items-end">
            <button onClick={() => setFl(F0)} className={btn2}><FilterX size={16} /> Reset Filter</button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-700">Menampilkan <b>{filtered.length}</b> dari <b>{trx.length}</b> transaksi.</p>
      </div>

      <TabelData rows={filtered} highlight={baru} selected={pilih} onToggle={toggle} onToggleAll={toggleAll} onDelete={onHapus}
        empty={trx.length ? "Tidak ada transaksi yang cocok dengan filter." : "Tabel Induk masih kosong. Catat transaksi terlebih dahulu."} />

      <div className="flex flex-wrap items-end gap-3 border-t border-slate-300 bg-slate-50 p-4 sm:px-6">
        <p className="w-full text-sm text-slate-800">
          <b>{terpilih.length}</b> baris dipilih. Centang kotak di header tabel untuk memilih semua baris hasil filter.
        </p>
        <Lbl t="Nama Tabel Turunan" cls="min-w-[220px] flex-1">
          <input className={box} placeholder="Contoh: Pembelian Bahan Baku Oktober" value={namaT} onChange={(e) => setNamaT(e.target.value)} />
        </Lbl>
        <button className={btn} onClick={buat} disabled={!terpilih.length || !namaT.trim()}>
          <FilePlus2 size={16} /> Buat Tabel Turunan
        </button>
      </div>
    </section>
  );
}
export default memo(TabInduk);
