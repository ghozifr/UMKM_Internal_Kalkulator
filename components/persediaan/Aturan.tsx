"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Wand2 } from "lucide-react";
import { newId } from "@/lib/data";
import { norm, type Pers } from "@/lib/persediaan";
import type { Opsi, Transaksi } from "@/lib/types";
import { btn } from "../ui";

type Props = { pers: Pers; setPers: Dispatch<SetStateAction<Pers>>; opsi: Opsi[]; trx: Transaksi[]; terkunci: boolean };

// Menentukan Sub Akun mana yang dihitung sebagai pembelian dan penjualan bahan baku.
export default function Aturan({ pers, setPers, opsi, trx, terkunci }: Props) {
  const [info, setInfo] = useState("");
  const akuns = useMemo(() => opsi.filter((o) => o.level === "akun"), [opsi]);
  const subs = useMemo(() => opsi.filter((o) => o.level === "subAkun"), [opsi]);
  const beli = new Set(pers.beli), jual = new Set(pers.jual);

  const ubah = (kunci: "beli" | "jual", id: string, on: boolean) =>
    setPers((p) => {
      const lain = kunci === "beli" ? "jual" : "beli";
      const ke = on ? [...p[kunci].filter((x) => x !== id), id] : p[kunci].filter((x) => x !== id);
      return { ...p, [kunci]: ke, [lain]: on ? p[lain].filter((x) => x !== id) : p[lain] };
    });

  // Daftar barang diambil dari nama Keterangan 1 yang sudah dipakai
  const isiOtomatis = () => {
    const produksiAkun = new Set(akuns.filter((a) => a.produksi).map((a) => a.id));
    const subProduksi = new Set(subs.filter((s) => s.parentId && produksiAkun.has(s.parentId)).map((s) => s.id));
    const subBahan = new Set([...pers.beli, ...pers.jual]);
    const calon = new Map<string, { nama: string; produk: boolean }>();
    const catat = (nama: string, produk: boolean) => { const k = norm(nama); if (k && !calon.has(k)) calon.set(k, { nama: nama.trim(), produk }); };
    for (const o of opsi) if (o.level === "ket1" && o.parentId) {
      if (subProduksi.has(o.parentId)) catat(o.nama, true);
      else if (subBahan.has(o.parentId)) catat(o.nama, false);
    }
    for (const t of trx) {
      if (t.aid && produksiAkun.has(t.aid)) catat(t.ket1, true);
      else if (t.sid && subBahan.has(t.sid)) catat(t.ket1, false);
    }
    const ada = new Set(pers.barang.map((b) => norm(b.nama)));
    const baru = [...calon].filter(([k]) => !ada.has(k)).map(([, c]) => ({ id: newId(), nama: c.nama, satuan: c.produk ? "Adn" : "Kg", produk: c.produk }));
    setInfo(baru.length ? `${baru.length} barang ditambahkan. Cek satuan dan jenisnya di tab Barang & Resep.` : "Tidak ada barang baru. Semua nama Keterangan 1 sudah terdaftar.");
    if (baru.length) setPers((p) => ({ ...p, barang: [...p.barang, ...baru.filter((b) => !p.barang.some((x) => norm(x.nama) === norm(b.nama)))] }));
  };

  const produksiAkun = akuns.filter((a) => a.produksi);
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">1. Sub Akun yang dihitung sebagai persediaan</h3>
        <p className="mt-1 text-sm text-slate-700">
          <b>Pembelian</b> menambah stok. <b>Penjualan</b> mengurangi stok. Nama barang dibaca dari <b>Keterangan 1</b> pada transaksi, jumlah dari kolom Jumlah, dan harga dari kolom Harga.
        </p>
        {terkunci && <p className="mt-2 text-sm font-semibold text-amber-900">Bulan ini sudah ditutup. Buka kembali dulu bila ingin mengubah aturan.</p>}
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-300">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-900">
              <tr><th className="px-3 py-2">Akun › Sub Akun</th><th className="px-3 py-2 text-center">Pembelian</th><th className="px-3 py-2 text-center">Penjualan</th></tr>
            </thead>
            <tbody>
              {akuns.filter((a) => !a.produksi).flatMap((a) => subs.filter((s) => s.parentId === a.id).map((s) => (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 text-slate-900"><span className="text-slate-600">{a.nama} › </span><b>{s.nama}</b></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" className="h-5 w-5 accent-teal-700" disabled={terkunci} checked={beli.has(s.id)}
                    aria-label={`${s.nama} sebagai pembelian`} onChange={(e) => ubah("beli", s.id, e.target.checked)} /></td>
                  <td className="px-3 py-2 text-center"><input type="checkbox" className="h-5 w-5 accent-teal-700" disabled={terkunci} checked={jual.has(s.id)}
                    aria-label={`${s.nama} sebagai penjualan`} onChange={(e) => ubah("jual", s.id, e.target.checked)} /></td>
                </tr>
              )))}
              {subs.length === 0 && <tr><td colSpan={3} className="px-3 py-3 text-slate-700">Belum ada Sub Akun.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900">2. Produksi</h3>
        {produksiAkun.length ? (
          <p className="mt-1 text-sm text-slate-700">Dibaca otomatis dari Akun produksi: {produksiAkun.map((a) => <b key={a.id} className="mr-1">{a.nama}</b>)}. Jumlah produksi diambil dari Keterangan 2, nama produk dari Keterangan 1.</p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-amber-900">Belum ada Akun produksi. Buka Kelola Akun di tab Catat, lalu centang &quot;Akun produksi&quot; pada akun yang dipakai untuk mencatat produksi.</p>
        )}
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900">3. Daftar barang</h3>
        <p className="mt-1 text-sm text-slate-700">Ambil nama barang dari Keterangan 1 yang sudah ada pada Sub Akun di atas dan pada Akun produksi.</p>
        <button className={`${btn} mt-3`} onClick={isiOtomatis}><Wand2 size={16} /> Isi barang otomatis</button>
        {info && <p role="status" className="mt-2 text-sm font-semibold text-teal-900">{info}</p>}
      </div>
    </div>
  );
}
