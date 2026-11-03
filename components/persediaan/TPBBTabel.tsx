"use client";

import { memo } from "react";
import type { HasilTPBB } from "@/lib/persediaan";
import { hg, q, rp } from "./fmt";

export type Rinci =
  | { jenis: "beli" | "jual" | "pakai"; barang: string }
  | { jenis: "produksi"; barang: string }
  | { jenis: "opname"; barang: string };

const th = "border border-slate-300 px-2 py-1.5 text-center text-xs font-bold text-slate-900";
const td = "border border-slate-200 px-2 py-2 text-right tabular-nums text-slate-900";
const tdTebal = `${td} font-semibold`;

function Sel(p: { v: string; onKlik?: () => void; label: string }) {
  if (!p.onKlik || p.v === "-") return <>{p.v}</>;
  return (
    <button onClick={p.onKlik} title="Lihat rinciannya" aria-label={p.label}
      className="rounded px-1 font-semibold text-teal-900 underline decoration-dotted underline-offset-4 hover:bg-teal-100">{p.v}</button>
  );
}

// Tabel Persediaan Bahan Baku, urutan kolom mengikuti sheet TPBB.
function TPBBTabel({ h, onRinci }: { h: HasilTPBB; onRinci: (r: Rinci) => void }) {
  if (h.baris.length === 0)
    return <p className="p-5 text-sm text-slate-700">Belum ada bahan baku. Buka tab <b>Aturan</b> lalu klik &quot;Isi barang otomatis&quot;, atau tambahkan di tab <b>Barang &amp; Resep</b>.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th rowSpan={2} className={`${th} sticky left-0 z-10 bg-slate-200`}>Jenis Barang</th>
            <th colSpan={3} className={`${th} bg-rose-100`}>Stok Awal</th>
            <th colSpan={3} className={`${th} bg-orange-100`}>Pembelian</th>
            <th colSpan={4} className={`${th} bg-emerald-100`}>Pemakaian</th>
            <th colSpan={2} className={`${th} bg-orange-100`}>Penjualan</th>
            <th rowSpan={2} className={`${th} bg-sky-100`}>Stok Sistem</th>
            <th colSpan={3} className={`${th} bg-amber-100`}>Stok Opname</th>
            <th colSpan={3} className={`${th} bg-violet-100`}>Stok Akhir</th>
          </tr>
          <tr>
            {["Jumlah", "Harga", "Total"].map((x) => <th key={"a" + x} className={`${th} bg-rose-50`}>{x}</th>)}
            {["Jumlah", "Harga Rata2", "Total"].map((x) => <th key={"b" + x} className={`${th} bg-orange-50`}>{x}</th>)}
            {["Resep", "Jumlah", "Harga Rata2", "Total"].map((x) => <th key={"c" + x} className={`${th} bg-emerald-50`}>{x}</th>)}
            {["Jumlah", "Total"].map((x) => <th key={"d" + x} className={`${th} bg-orange-50`}>{x}</th>)}
            {["Real", "Selisih", "Adj. (Rp)"].map((x) => <th key={"e" + x} className={`${th} bg-amber-50`}>{x}</th>)}
            {["Jumlah", "Harga", "Total"].map((x) => <th key={"f" + x} className={`${th} bg-violet-50`}>{x}</th>)}
          </tr>
        </thead>
        <tbody>
          {h.baris.map((b) => {
            const n = b.barang.nama;
            return (
              <tr key={b.barang.id} className="hover:bg-slate-50">
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap border border-slate-200 bg-white px-2 py-2 text-left font-semibold text-slate-900">
                  {n} <span className="text-xs font-normal text-slate-600">{b.barang.satuan}</span>
                </th>
                <td className={td}>{q(b.awal.jumlah)}</td><td className={td}>{hg(b.awal.harga)}</td><td className={td}>{rp(b.awal.total)}</td>
                <td className={td}><Sel v={q(b.beli.jumlah)} label={`Rincian pembelian ${n}`} onKlik={() => onRinci({ jenis: "beli", barang: b.barang.id })} /></td>
                <td className={td}>{hg(b.beli.harga)}</td><td className={td}>{rp(b.beli.total)}</td>
                <td className={td}>{q(b.pakai.takaran)}</td>
                <td className={td}><Sel v={q(b.pakai.jumlah)} label={`Rincian pemakaian ${n}`} onKlik={() => onRinci({ jenis: "pakai", barang: b.barang.id })} /></td>
                <td className={td}>{hg(b.harga)}</td><td className={td}>{rp(b.pakai.total)}</td>
                <td className={td}><Sel v={q(b.jual.jumlah)} label={`Rincian penjualan ${n}`} onKlik={() => onRinci({ jenis: "jual", barang: b.barang.id })} /></td>
                <td className={td}>{rp(b.jual.total)}</td>
                <td className={`${tdTebal} ${b.sistem.jumlah < -1e-9 ? "bg-rose-50 text-rose-900" : ""}`}>{q(b.sistem.jumlah)}</td>
                <td className={td}>{b.opname ? <Sel v={q(b.opname.real)} label={`Rincian opname ${n}`} onKlik={() => onRinci({ jenis: "opname", barang: b.barang.id })} /> : <span className="text-slate-500">belum</span>}</td>
                <td className={`${td} ${b.selisih < 0 ? "text-rose-800" : b.selisih > 0 ? "text-emerald-800" : ""}`}>{q(b.selisih)}</td>
                <td className={`${td} ${b.adjRp < 0 ? "text-rose-800" : b.adjRp > 0 ? "text-emerald-800" : ""}`}>{rp(b.adjRp)}</td>
                <td className={tdTebal}>{q(b.akhir.jumlah)}</td><td className={td}>{hg(b.harga)}</td><td className={tdTebal}>{rp(b.akhir.total)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold">
            <th scope="row" className="sticky left-0 z-10 border border-slate-300 bg-slate-100 px-2 py-2 text-left">Total (Rp)</th>
            <td className={td} colSpan={2} /><td className={tdTebal}>{rp(h.total.awal)}</td>
            <td className={td} colSpan={2} /><td className={tdTebal}>{rp(h.total.beli)}</td>
            <td className={td} colSpan={3} /><td className={tdTebal}>{rp(h.total.pakai)}</td>
            <td className={td} /><td className={tdTebal}>{rp(h.total.jual)}</td>
            <td className={td} colSpan={3} />
            <td className={tdTebal}>{rp(h.total.adj)}</td>
            <td className={td} colSpan={2} /><td className={tdTebal}>{rp(h.total.akhir)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
export default memo(TPBBTabel);
