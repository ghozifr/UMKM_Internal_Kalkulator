"use client";

import { memo, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Lock, LockOpen } from "lucide-react";
import type { Indeks } from "@/lib/data";
import {
  adaIsi, berubahSetelahTutup, bukaKembali, geserPeriode, hitungTPBB, namaPeriode, PERIODE_RE, periodeIni, tutupBulan,
  type Pers,
} from "@/lib/persediaan";
import type { Opsi, Transaksi } from "@/lib/types";
import Modal from "./Modal";
import { btn, btn2, card } from "./ui";
import Aturan from "./persediaan/Aturan";
import BarangResep from "./persediaan/BarangResep";
import { hg, q, rp, tgl } from "./persediaan/fmt";
import Opname from "./persediaan/Opname";
import TPBBTabel, { type Rinci } from "./persediaan/TPBBTabel";

type Props = { pers: Pers; setPers: Dispatch<SetStateAction<Pers>>; trx: Transaksi[]; opsi: Opsi[]; idx: Indeks };
type Sub = "tpbb" | "barang" | "opname" | "aturan";
const SUBS: { k: Sub; t: string }[] = [
  { k: "tpbb", t: "TPBB" }, { k: "barang", t: "Barang & Resep" }, { k: "opname", t: "Stok Opname" }, { k: "aturan", t: "Aturan" },
];
const BATAS = 300;
const th = "px-3 py-2 text-left text-xs font-bold text-slate-900";
const td = "px-3 py-1.5 text-sm text-slate-900";

function TabPersediaan({ pers, setPers, trx, opsi, idx }: Props) {
  const [periode, setPeriode] = useState(periodeIni);
  const [sub, setSub] = useState<Sub>(adaIsi(pers) ? "tpbb" : "aturan");
  const [rinci, setRinci] = useState<Rinci | null>(null);

  const h = useMemo(() => hitungTPBB(pers, trx, idx, periode), [pers, trx, idx, periode]);
  const tutup = pers.tutup.find((t) => t.periode === periode);
  const berubah = !!tutup && berubahSetelahTutup(h, tutup);
  const depanTutup = pers.tutup.some((t) => t.periode === geserPeriode(periode, 1));

  const tutupSekarang = () => {
    const pesan = depanTutup
      ? `Stok akhir ${namaPeriode(periode)} menjadi stok awal ${namaPeriode(geserPeriode(periode, 1))}. Bulan berikutnya sudah pernah ditutup, jadi tutup ulang juga setelah ini. Lanjutkan?`
      : `Stok akhir ${namaPeriode(periode)} menjadi stok awal ${namaPeriode(geserPeriode(periode, 1))}. Stok awal, aturan, dan opname bulan ini dikunci. Lanjutkan?`;
    if (confirm(pesan)) setPers((p) => tutupBulan(p, h, periode, new Date().toLocaleDateString("sv-SE")));
  };
  const bukaLagi = () => {
    if (confirm(`Buka kembali ${namaPeriode(periode)}? Stok awal bulan berikutnya tidak berubah sampai Anda menutup bulan ini lagi.`))
      setPers((p) => bukaKembali(p, periode));
  };
  const unduh = async () => {
    const { exportPersediaan } = await import("@/lib/exportPersediaan");
    await exportPersediaan(h, periode, `TPBB ${periode}.xlsx`);
  };

  const barisRinci = rinci && (h.baris.find((b) => b.barang.id === rinci.barang) ?? null);
  const produkRinci = rinci?.jenis === "produksi" ? h.produksi.find((p) => p.barang.id === rinci.barang) : undefined;

  return (
    <section className={`overflow-hidden ${card}`}>
      <div className="border-b border-slate-300 p-4 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Persediaan Bahan Baku (TPBB)</h2>
        <p className="text-sm text-slate-700">Dihitung otomatis dari Tabel Induk. Klik angka bergaris titik untuk melihat kode transaksi penyusunnya.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={btn2} aria-label="Bulan sebelumnya" onClick={() => setPeriode((p) => geserPeriode(p, -1))}><ChevronLeft size={16} /></button>
          <input type="month" aria-label="Bulan laporan" value={periode} onChange={(e) => PERIODE_RE.test(e.target.value) && setPeriode(e.target.value)}
            className="rounded-xl border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-900" />
          <button className={btn2} aria-label="Bulan berikutnya" onClick={() => setPeriode((p) => geserPeriode(p, 1))}><ChevronRight size={16} /></button>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tutup ? "bg-slate-800 text-white" : "bg-emerald-100 text-emerald-900"}`}>
            {tutup ? <><Lock size={13} /> Ditutup {tgl(tutup.tgl)}</> : <><LockOpen size={13} /> Terbuka</>}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className={btn2} onClick={unduh} disabled={!h.baris.length}><Download size={16} /> Unduh Excel</button>
            {tutup ? <button className={btn2} onClick={bukaLagi}><LockOpen size={16} /> Buka kembali</button>
              : <button className={btn} onClick={tutupSekarang} disabled={!h.baris.length}><Lock size={16} /> Tutup bulan</button>}
          </div>
        </div>

        <div role="tablist" className="mt-4 flex flex-wrap gap-2">
          {SUBS.map((s) => (
            <button key={s.k} role="tab" aria-selected={sub === s.k} onClick={() => setSub(s.k)}
              className={`press rounded-full border px-4 py-1.5 text-sm font-semibold ${sub === s.k ? "border-teal-700 bg-teal-700 text-white" : "border-slate-400 bg-white text-slate-800 hover:bg-slate-100"}`}>{s.t}</button>
          ))}
        </div>
      </div>

      {berubah && (
        <div role="alert" className="flex items-start gap-2 border-b border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950 sm:px-6">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>Angka bulan ini berbeda dari saat ditutup (ada transaksi yang ditambah, diubah, atau dihapus). Stok awal bulan berikutnya masih memakai angka lama. Klik <b>Buka kembali</b> lalu <b>Tutup bulan</b> lagi untuk memperbarui.</p>
        </div>
      )}
      {(h.peringatan.length > 0 || h.belumTerdaftar.length > 0) && sub === "tpbb" && (
        <div className="space-y-1 border-b border-slate-300 bg-amber-50 p-4 text-sm text-amber-950 sm:px-6">
          <p className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Perlu dicek</p>
          <ul className="list-disc pl-6">
            {h.belumTerdaftar.length > 0 && (
              <li>Nama belum terdaftar sebagai barang: {h.belumTerdaftar.map((x) => x.nama).join(", ")}. Daftarkan lewat tab <b>Aturan</b> (Isi barang otomatis) atau <b>Barang &amp; Resep</b>.</li>
            )}
            {h.peringatan.slice(0, 8).map((p, i) => <li key={i}>{p}</li>)}
            {h.peringatan.length > 8 && <li>dan {h.peringatan.length - 8} peringatan lain.</li>}
          </ul>
        </div>
      )}

      {sub === "tpbb" && (
        <>
          {h.produksi.length > 0 && (
            <div className="border-b border-slate-300 bg-slate-50 p-4 sm:px-6">
              <p className="mb-2 text-sm font-bold text-slate-900">Produksi {namaPeriode(periode)} (pengali resep)</p>
              <ul className="flex flex-wrap gap-2">
                {h.produksi.map((p) => (
                  <li key={p.barang.id} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-300">
                    <span className="font-semibold text-slate-900">{p.barang.nama}</span>{" "}
                    <button className="font-bold tabular-nums text-teal-900 underline decoration-dotted underline-offset-4" aria-label={`Rincian produksi ${p.barang.nama}`}
                      onClick={() => setRinci({ jenis: "produksi", barang: p.barang.id })}>{q(p.jumlah)}</button>{" "}
                    <span className="text-slate-600">{p.barang.satuan}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <TPBBTabel h={h} onRinci={setRinci} />
          <p className="p-4 text-xs text-slate-700 sm:px-6">
            Harga rata-rata = (total stok awal + total pembelian) ÷ (jumlah stok awal + jumlah pembelian). Pemakaian = takaran resep × produksi. Penjualan bahan baku dinilai dengan harga rata-rata.
          </p>
        </>
      )}
      {sub === "barang" && <BarangResep pers={pers} setPers={setPers} periode={periode} terkunci={!!tutup} />}
      {sub === "opname" && <Opname pers={pers} setPers={setPers} h={h} periode={periode} terkunci={!!tutup} />}
      {sub === "aturan" && <Aturan pers={pers} setPers={setPers} opsi={opsi} trx={trx} terkunci={!!tutup} />}

      {rinci && (barisRinci || produkRinci) && (
        <Modal lebar onClose={() => setRinci(null)}
          title={`${{ beli: "Pembelian", jual: "Penjualan", pakai: "Pemakaian", produksi: "Produksi", opname: "Opname" }[rinci.jenis]} ${(barisRinci?.barang ?? produkRinci!.barang).nama}`}
          subtitle={namaPeriode(periode)}>
          {rinci.jenis === "pakai" && barisRinci && (
            barisRinci.pakai.rinci.length === 0 ? <p className="text-sm text-slate-700">Bahan ini belum ada di resep mana pun.</p> : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100"><tr><th className={th}>Hasil produksi</th><th className={`${th} text-right`}>Takaran</th><th className={`${th} text-right`}>Produksi</th><th className={`${th} text-right`}>Pemakaian</th></tr></thead>
                <tbody>
                  {barisRinci.pakai.rinci.map((r) => (
                    <tr key={r.produk.id} className="border-t border-slate-200">
                      <td className={td}>{r.produk.nama}</td><td className={`${td} text-right tabular-nums`}>{q(r.takaran)}</td>
                      <td className={`${td} text-right tabular-nums`}>{q(r.produksi)}</td><td className={`${td} text-right font-semibold tabular-nums`}>{q(r.takaran * r.produksi)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-bold"><td className={td} colSpan={3}>Total ({barisRinci.barang.satuan}) × harga rata-rata {hg(barisRinci.harga)}</td><td className={`${td} text-right tabular-nums`}>{q(barisRinci.pakai.jumlah)} = Rp {rp(barisRinci.pakai.total)}</td></tr>
                </tbody>
              </table>
            )
          )}
          {(rinci.jenis === "beli" || rinci.jenis === "jual") && barisRinci && (
            <DaftarTrx rows={rinci.jenis === "beli" ? barisRinci.beli.trx : barisRinci.jual.trx} nilai />
          )}
          {rinci.jenis === "produksi" && produkRinci && <DaftarTrx rows={produkRinci.trx} produksi />}
          {rinci.jenis === "opname" && barisRinci?.opname && (
            <dl className="space-y-1 text-sm text-slate-900">
              <div><dt className="inline font-semibold">Tanggal: </dt><dd className="inline">{tgl(barisRinci.opname.tanggal)}</dd></div>
              <div><dt className="inline font-semibold">Stok real: </dt><dd className="inline">{q(barisRinci.opname.real)} {barisRinci.barang.satuan}</dd></div>
              <div><dt className="inline font-semibold">Stok sistem pada tanggal itu: </dt><dd className="inline">{q(barisRinci.sistemPada(barisRinci.opname.tanggal))}</dd></div>
              <div><dt className="inline font-semibold">Selisih: </dt><dd className="inline">{q(barisRinci.selisih)} (Rp {rp(barisRinci.adjRp)})</dd></div>
              <div><dt className="inline font-semibold">Catatan: </dt><dd className="inline">{barisRinci.opname.catatan || "-"}</dd></div>
            </dl>
          )}
        </Modal>
      )}
    </section>
  );
}

function DaftarTrx({ rows, nilai, produksi }: { rows: Transaksi[]; nilai?: boolean; produksi?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-slate-700">Tidak ada transaksi pada bulan ini.</p>;
  const tampil = rows.slice(0, BATAS);
  const jumlah = rows.reduce((x, t) => x + (produksi ? Number(t.ket2.replace(",", ".")) || 0 : t.jumlah), 0);
  const total = rows.reduce((x, t) => x + t.jumlah * t.harga, 0);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className={th}>Kode</th><th className={th}>Tanggal</th>
              {produksi ? <><th className={th}>Kas</th><th className={`${th} text-right`}>Jumlah (Ket 2)</th><th className={th}>Ket 3</th></>
                : <><th className={`${th} text-right`}>Jumlah</th><th className={`${th} text-right`}>Harga</th><th className={`${th} text-right`}>Total</th></>}
            </tr>
          </thead>
          <tbody>
            {tampil.map((t) => (
              <tr key={t.id} className="border-t border-slate-200">
                <td className={`${td} font-mono font-semibold text-teal-800`}>{t.kode}</td><td className={td}>{tgl(t.tanggal)}</td>
                {produksi ? <><td className={td}>{t.kas}</td><td className={`${td} text-right tabular-nums`}>{t.ket2}</td><td className={td}>{t.ket3 || "-"}</td></>
                  : <><td className={`${td} text-right tabular-nums`}>{q(t.jumlah)}</td><td className={`${td} text-right tabular-nums`}>{hg(t.harga)}</td><td className={`${td} text-right tabular-nums`}>{rp(t.jumlah * t.harga)}</td></>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > BATAS && <p className="mt-2 text-sm text-slate-700">Menampilkan {BATAS} dari {rows.length} baris.</p>}
      <p className="mt-3 text-sm font-bold text-slate-900">Total {rows.length} baris: {q(jumlah)}{nilai ? ` · Rp ${rp(total)}` : ""}</p>
    </>
  );
}
export default memo(TabPersediaan);
