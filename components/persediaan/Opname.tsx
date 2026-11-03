"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Trash2 } from "lucide-react";
import { newId } from "@/lib/data";
import type { HasilTPBB, Pers } from "@/lib/persediaan";
import { box, btn, Lbl } from "../ui";
import { hariTerakhir, q, rp, tgl } from "./fmt";

type Props = { pers: Pers; setPers: Dispatch<SetStateAction<Pers>>; h: HasilTPBB; periode: string; terkunci: boolean };

// Stok opname: hitung fisik di gudang, bandingkan dengan stok sistem. Selisihnya menjadi adjustment.
export default function Opname({ pers, setPers, h, periode, terkunci }: Props) {
  const hariIni = new Date().toLocaleDateString("sv-SE");
  const awal = hariIni.startsWith(periode) ? hariIni : hariTerakhir(periode);
  const [barang, setBarang] = useState("");
  const [tanggal, setTanggal] = useState(awal);
  const [real, setReal] = useState("");
  const [catatan, setCatatan] = useState("");
  const bahan = pers.barang.filter((b) => !b.produk);
  const dalam = tanggal.startsWith(periode);
  const nilai = real.trim() === "" ? null : Number(real.replace(",", "."));
  const bisa = !terkunci && barang !== "" && dalam && nilai !== null && Number.isFinite(nilai) && nilai >= 0;
  const baris = new Map(h.baris.map((b) => [b.barang.id, b]));
  const daftar = pers.opname.filter((o) => o.periode === periode).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const belum = h.baris.filter((b) => !b.opname);

  const simpan = () => {
    if (!bisa) return;
    setPers((p) => ({ ...p, opname: [...p.opname, { id: newId(), periode, tanggal, barang, real: nilai!, catatan: catatan.trim() }] }));
    setReal(""); setCatatan("");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <section>
        <h3 className="text-base font-bold text-slate-900">Catat stok opname</h3>
        <p className="mt-1 text-sm text-slate-700">Masukkan jumlah stok yang benar-benar ada di gudang. Selisih dengan stok sistem menjadi adjustment (kg dan Rp), dan stok akhir mengikuti hasil hitungan fisik. Jika ada beberapa opname untuk barang yang sama, yang tanggalnya paling baru dipakai.</p>
        {terkunci && <p className="mt-2 text-sm font-semibold text-amber-900">Bulan ini sudah ditutup. Buka kembali dulu untuk menambah atau menghapus opname.</p>}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Lbl t="Barang">
            <select className={box} value={barang} onChange={(e) => setBarang(e.target.value)} disabled={terkunci}>
              <option value="">Pilih barang…</option>
              {bahan.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
            </select>
          </Lbl>
          <Lbl t="Tanggal hitung">
            <input type="date" className={box} value={tanggal} onChange={(e) => setTanggal(e.target.value)} disabled={terkunci} />
            {!dalam && <span className="mt-1 block text-sm font-semibold text-rose-800">Tanggal harus berada di bulan {periode}.</span>}
          </Lbl>
          <Lbl t={`Stok real${barang ? ` (${bahan.find((b) => b.id === barang)?.satuan ?? ""})` : ""}`}>
            <input className={box} inputMode="decimal" placeholder="0" value={real} onChange={(e) => setReal(e.target.value)} disabled={terkunci} />
            {barang && baris.get(barang) && <span className="mt-1 block text-sm text-slate-700">Stok sistem sampai {tgl(tanggal)}: <b>{q(baris.get(barang)!.sistemPada(tanggal))}</b></span>}
          </Lbl>
          <Lbl t="Catatan (siapa yang menghitung, dll.)">
            <input className={box} maxLength={300} value={catatan} onChange={(e) => setCatatan(e.target.value)} disabled={terkunci} />
          </Lbl>
        </div>
        <button className={`${btn} mt-3`} onClick={simpan} disabled={!bisa}>Simpan opname</button>
      </section>

      {belum.length > 0 && daftar.length > 0 && (
        <p className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">Belum di-opname bulan ini: {belum.map((b) => b.barang.nama).join(", ")}.</p>
      )}

      <section>
        <h3 className="text-base font-bold text-slate-900">Riwayat opname {periode}</h3>
        {daftar.length === 0 ? <p className="mt-2 text-sm text-slate-700">Belum ada opname bulan ini.</p> : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-300">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-900">
                <tr><th className="px-3 py-2">Tanggal</th><th className="px-3 py-2">Barang</th><th className="px-3 py-2 text-right">Real</th><th className="px-3 py-2 text-right">Sistem (pada tanggal itu)</th>
                  <th className="px-3 py-2 text-right">Selisih</th><th className="px-3 py-2 text-right">Adj. (Rp)</th><th className="px-3 py-2">Catatan</th><th className="px-3 py-2"><span className="sr-only">Hapus</span></th></tr>
              </thead>
              <tbody>
                {daftar.map((o) => {
                  const b = baris.get(o.barang);
                  const dipakai = b?.opname?.id === o.id;
                  const sistem = b ? b.sistemPada(o.tanggal) : 0;
                  const selisih = b ? o.real - sistem : 0;
                  return (
                    <tr key={o.id} className={`border-t border-slate-200 ${dipakai ? "" : "text-slate-500"}`}>
                      <td className="whitespace-nowrap px-3 py-2">{tgl(o.tanggal)}</td>
                      <td className="px-3 py-2 font-semibold">{b?.barang.nama ?? "(barang dihapus)"}{!dipakai && <span className="ml-1 text-xs font-normal">(diganti opname lebih baru)</span>}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{q(o.real)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b ? q(sistem) : "-"}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${dipakai ? (selisih < 0 ? "text-rose-800" : selisih > 0 ? "text-emerald-800" : "") : ""}`}>{q(selisih)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b ? rp(selisih * b.harga) : "-"}</td>
                      <td className="px-3 py-2">{o.catatan || "-"}</td>
                      <td className="px-2 py-1"><button disabled={terkunci} aria-label={`Hapus opname ${b?.barang.nama ?? ""} ${tgl(o.tanggal)}`}
                        className="press rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        onClick={() => confirm("Hapus catatan opname ini?") && setPers((p) => ({ ...p, opname: p.opname.filter((x) => x.id !== o.id) }))}><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
