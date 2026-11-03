"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { newId } from "@/lib/data";
import { norm, type Barang, type Pers } from "@/lib/persediaan";
import { box as boxFull, btn, btn2 } from "../ui";

const box = boxFull.replace("w-full ", "");
type Props = { pers: Pers; setPers: Dispatch<SetStateAction<Pers>>; periode: string; terkunci: boolean };
const angkaInput = (v: string) => { const n = Number(v.replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : null; };

// Daftar barang dan stok awal bulan ini, serta resep: takaran tiap bahan untuk 1 satuan produk.
export default function BarangResep({ pers, setPers, periode, terkunci }: Props) {
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("Kg");
  const [produk, setProduk] = useState(false);
  const [err, setErr] = useState("");
  const bahan = pers.barang.filter((b) => !b.produk);
  const produkList = pers.barang.filter((b) => b.produk);
  const awalDari = (id: string) => pers.awal.find((a) => a.periode === periode && a.barang === id);

  const tambah = () => {
    const v = nama.trim();
    if (!v) return;
    if (pers.barang.some((b) => norm(b.nama) === norm(v))) return setErr(`"${v}" sudah ada.`);
    setPers((p) => ({ ...p, barang: [...p.barang, { id: newId(), nama: v, satuan: satuan.trim() || "Kg", produk }] }));
    setNama(""); setErr("");
  };
  const ubahBarang = (id: string, patch: Partial<Barang>) =>
    setPers((p) => ({ ...p, barang: p.barang.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const hapus = (b: Barang) => {
    if (!confirm(`Hapus "${b.nama}"? Resep, stok awal, dan opname barang ini ikut terhapus. Transaksi di Tabel Induk tidak berubah.`)) return;
    setPers((p) => ({
      ...p, barang: p.barang.filter((x) => x.id !== b.id),
      resep: p.resep.filter((r) => r.bahan !== b.id && r.produk !== b.id),
      awal: p.awal.filter((a) => a.barang !== b.id), opname: p.opname.filter((o) => o.barang !== b.id),
    }));
  };
  const setAwal = (barang: string, patch: { jumlah?: number; harga?: number }) =>
    setPers((p) => {
      const ada = p.awal.find((a) => a.periode === periode && a.barang === barang);
      const baru = { periode, barang, jumlah: ada?.jumlah ?? 0, harga: ada?.harga ?? 0, ...patch };
      return { ...p, awal: ada ? p.awal.map((a) => (a === ada ? baru : a)) : [...p.awal, baru] };
    });

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <section>
        <h3 className="text-base font-bold text-slate-900">Daftar barang</h3>
        <p className="mt-1 text-sm text-slate-700">
          Nama barang harus sama dengan <b>Keterangan 1</b> pada transaksi. <b>Bahan baku</b> dihitung stoknya. <b>Hasil produksi</b> (mis. Adonan) hanya menjadi pengali resep.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={`${box} min-w-0 flex-1`} maxLength={120} placeholder="Nama barang, mis. ACI ob 1" value={nama}
            onChange={(e) => { setNama(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && tambah()} />
          <input className={`${box} w-24`} maxLength={20} placeholder="Satuan" aria-label="Satuan" value={satuan} onChange={(e) => setSatuan(e.target.value)} />
          <select className={box} aria-label="Jenis barang" value={produk ? "produk" : "bahan"} onChange={(e) => setProduk(e.target.value === "produk")}>
            <option value="bahan">Bahan baku</option><option value="produk">Hasil produksi</option>
          </select>
          <button className={btn} onClick={tambah}><Plus size={16} /> Tambah</button>
        </div>
        {err && <p role="alert" className="mt-2 text-sm font-semibold text-rose-800">{err}</p>}

        {pers.barang.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-slate-900">
                <tr>
                  <th className="px-3 py-2">Nama</th><th className="px-3 py-2">Satuan</th><th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2">Stok awal ({periode})</th><th className="px-3 py-2">Harga awal / satuan</th><th className="px-3 py-2"><span className="sr-only">Hapus</span></th>
                </tr>
              </thead>
              <tbody>
                {pers.barang.map((b) => {
                  const a = awalDari(b.id);
                  return (
                    <tr key={b.id} className="border-t border-slate-200 align-middle">
                      <td className="px-2 py-1.5">
                        <input className={`${box} w-44`} maxLength={120} defaultValue={b.nama} aria-label={`Nama ${b.nama}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (!v || v === b.nama) { e.target.value = b.nama; return; }
                            if (pers.barang.some((x) => x.id !== b.id && norm(x.nama) === norm(v))) { e.target.value = b.nama; setErr(`"${v}" sudah ada.`); return; }
                            setErr(""); ubahBarang(b.id, { nama: v });
                          }} />
                      </td>
                      <td className="px-2 py-1.5"><input className={`${box} w-20`} maxLength={20} defaultValue={b.satuan} aria-label={`Satuan ${b.nama}`}
                        onBlur={(e) => ubahBarang(b.id, { satuan: e.target.value.trim() || "Kg" })} /></td>
                      <td className="px-2 py-1.5">
                        <select className={box} value={b.produk ? "produk" : "bahan"} aria-label={`Jenis ${b.nama}`}
                          onChange={(e) => ubahBarang(b.id, { produk: e.target.value === "produk" })}>
                          <option value="bahan">Bahan baku</option><option value="produk">Hasil produksi</option>
                        </select>
                      </td>
                      {b.produk ? <td className="px-3 py-1.5 text-slate-600" colSpan={2}>tidak dihitung stoknya</td> : (
                        <>
                          <td className="px-2 py-1.5"><input key={`j${a?.jumlah}`} className={`${box} w-28 text-right`} inputMode="decimal" disabled={terkunci}
                            defaultValue={a?.jumlah || ""} placeholder="0" aria-label={`Stok awal ${b.nama}`}
                            onBlur={(e) => { const n = angkaInput(e.target.value); if (n === null) e.target.value = String(a?.jumlah ?? ""); else if (n !== (a?.jumlah ?? 0)) setAwal(b.id, { jumlah: n }); }} /></td>
                          <td className="px-2 py-1.5"><input key={`h${a?.harga}`} className={`${box} w-32 text-right`} inputMode="decimal" disabled={terkunci}
                            defaultValue={a?.harga || ""} placeholder="0" aria-label={`Harga awal ${b.nama}`}
                            onBlur={(e) => { const n = angkaInput(e.target.value); if (n === null) e.target.value = String(a?.harga ?? ""); else if (n !== (a?.harga ?? 0)) setAwal(b.id, { harga: n }); }} /></td>
                        </>
                      )}
                      <td className="px-2 py-1.5"><button aria-label={`Hapus ${b.nama}`} className="press rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700" onClick={() => hapus(b)}><Trash2 size={16} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {terkunci && <p className="mt-2 text-sm font-semibold text-amber-900">Bulan ini sudah ditutup, jadi stok awal dikunci. Stok awal bulan berikutnya terisi otomatis dari stok akhir.</p>}
        {!terkunci && pers.barang.length > 0 && <p className="mt-2 text-sm text-slate-700">Stok awal hanya perlu diisi untuk bulan pertama. Bulan berikutnya terisi otomatis lewat Tutup Bulan.</p>}
      </section>

      <section>
        <h3 className="text-base font-bold text-slate-900">Resep</h3>
        <p className="mt-1 text-sm text-slate-700">Takaran tiap bahan untuk <b>1 satuan</b> hasil produksi. Pemakaian bahan = takaran × jumlah produksi bulan itu.</p>
        {produkList.length === 0 && <p className="mt-2 text-sm font-semibold text-amber-900">Belum ada hasil produksi. Tambahkan barang berjenis &quot;Hasil produksi&quot; (mis. Adonan) di atas.</p>}
        <div className="mt-3 space-y-4">
          {produkList.map((pr) => (
            <ResepProduk key={pr.id} produk={pr} bahan={bahan} pers={pers} setPers={setPers} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ResepProduk({ produk, bahan, pers, setPers }: { produk: Barang; bahan: Barang[]; pers: Pers; setPers: Dispatch<SetStateAction<Pers>> }) {
  const [pilih, setPilih] = useState("");
  const [takaran, setTakaran] = useState("");
  const baris = pers.resep.filter((r) => r.produk === produk.id);
  const pakai = new Set(baris.map((r) => r.bahan));
  const sisa = bahan.filter((b) => !pakai.has(b.id));
  const nilai = angkaInput(takaran);
  const simpan = (id: string, n: number) =>
    setPers((p) => ({ ...p, resep: p.resep.map((r) => (r.id === id ? { ...r, takaran: n } : r)) }));

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 sm:p-4">
      <p className="text-sm font-bold text-slate-900">Resep 1 {produk.satuan} {produk.nama}</p>
      <ul className="mt-2 space-y-2">
        {baris.length === 0 && <li className="text-sm text-slate-700">Belum ada bahan.</li>}
        {baris.map((r) => {
          const b = pers.barang.find((x) => x.id === r.bahan);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[8rem] flex-1 text-sm font-semibold text-slate-900">{b?.nama ?? "(barang dihapus)"}</span>
              <input key={r.takaran} className={`${box} w-28 text-right`} inputMode="decimal" defaultValue={r.takaran} aria-label={`Takaran ${b?.nama}`}
                onBlur={(e) => { const n = angkaInput(e.target.value); if (n === null) e.target.value = String(r.takaran); else if (n !== r.takaran) simpan(r.id, n); }} />
              <span className="w-10 text-sm text-slate-700">{b?.satuan}</span>
              <button aria-label={`Hapus ${b?.nama} dari resep`} className="press rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setPers((p) => ({ ...p, resep: p.resep.filter((x) => x.id !== r.id) }))}><Trash2 size={16} /></button>
            </li>
          );
        })}
      </ul>
      {sisa.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select className={box} value={pilih} aria-label={`Bahan untuk resep ${produk.nama}`} onChange={(e) => setPilih(e.target.value)}>
            <option value="">Pilih bahan…</option>
            {sisa.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
          </select>
          <input className={`${box} w-28 text-right`} inputMode="decimal" placeholder="Takaran" aria-label={`Takaran baru untuk ${produk.nama}`} value={takaran} onChange={(e) => setTakaran(e.target.value)} />
          <button className={btn2} disabled={!pilih || nilai === null || nilai <= 0}
            onClick={() => { setPers((p) => ({ ...p, resep: [...p.resep, { id: newId(), produk: produk.id, bahan: pilih, takaran: nilai! }] })); setPilih(""); setTakaran(""); }}>
            <Plus size={16} /> Tambah ke resep
          </button>
        </div>
      )}
    </div>
  );
}
