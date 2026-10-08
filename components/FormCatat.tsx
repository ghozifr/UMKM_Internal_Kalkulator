"use client";

import { memo, useMemo, useState } from "react";
import { hitung, rupiah } from "@/lib/format";
import { prefixKode } from "@/lib/kode";
import { daftar, type Indeks } from "@/lib/data";
import type { Input } from "@/lib/store";
import type { Level, Transaksi } from "@/lib/types";
import { Lbl, Pilih, Seksi, box, btn, card } from "./ui";
import TabelData from "./TabelData";

const BLANK = { tanggal: "", akunId: "", subId: "", kasId: "", k1: "", ket2: "", ket3: "", jumlah: 0, harga: 0 };
const hariIni = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD

// Nilai Keterangan 2/3 yang pernah diketik, sebagai saran pengetikan.
function saranDari(trx: readonly Transaksi[], f: "ket2" | "ket3") {
  const s = new Set<string>();
  for (const t of trx) {
    if (t[f]) s.add(t[f]);
    if (s.size >= 40) break;
  }
  return [...s];
}

type Props = {
  idx: Indeks;
  trx: readonly Transaksi[];
  baru: string;
  kodeBerikut: (prefix: string) => { kode: string; n: number };
  simpanTrx: (f: Input) => Transaksi | null;
  onHapus: (t: Transaksi) => void;
  onKelola: (level: Level, parentId?: string) => void;
  onSimpan: (pesan: string, id: string) => void;
};

function FormCatat({ idx, trx, baru, kodeBerikut, simpanTrx, onHapus, onKelola, onSimpan }: Props) {
  // State formulir hidup di sini, jadi mengetik tidak menggambar ulang halaman lain.
  const [form, setForm] = useState(BLANK);
  const set = (patch: Partial<typeof BLANK>) => setForm((s) => ({ ...s, ...patch }));

  // Pilihan yang sudah dihapus atau tidak lagi cocok dengan induknya dianggap kosong
  const ada = (id: string) => (id && idx.byId.has(id) ? id : "");
  const akunId = ada(form.akunId);
  const subId = idx.byId.get(form.subId)?.parentId === akunId ? ada(form.subId) : "";
  const k1Id = subId && idx.byId.get(form.k1)?.parentId === subId ? form.k1 : "";
  const kasId = ada(form.kasId);
  const akun = idx.byId.get(akunId), sub = idx.byId.get(subId), k1 = idx.byId.get(k1Id);

  const total = hitung(form.jumlah, form.harga);
  const prefix = akun && sub ? prefixKode(akun, sub, k1) : "";
  const kode = prefix ? kodeBerikut(prefix).kode : "";
  const bisa = !!(form.tanggal && akun && sub && kasId && total > 0);

  const recent = useMemo(() => trx.slice(0, 5), [trx]);
  const saran2 = useMemo(() => saranDari(trx, "ket2"), [trx]);
  const saran3 = useMemo(() => saranDari(trx, "ket3"), [trx]);

  const simpan = () => {
    if (!bisa) return;
    const t = simpanTrx({
      tanggal: form.tanggal, akunId, subId, kasId, k1Id,
      ket2: form.ket2, ket3: form.ket3, jumlah: form.jumlah, harga: form.harga,
    });
    if (!t) return;
    onSimpan(`Transaksi ${t.kode} tersimpan di Tabel Induk.`, t.id);
    setForm({ ...BLANK, tanggal: form.tanggal, kasId });
  };

  return (
    <>
      <section className={`p-4 sm:p-6 ${card}`}>
        <h2 className="mb-5 text-lg font-bold text-slate-900">Catat Transaksi</h2>

        <Seksi n={1} t="Tanggal, Akun, dan Kas">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Lbl t="Tanggal">
              <input type="date" className={box} value={form.tanggal} onChange={(e) => set({ tanggal: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); set({ tanggal: hariIni() }); } }} />
              <span className="mt-1 block text-sm text-slate-600">Tekan Enter untuk mengisi tanggal hari ini.</span>
            </Lbl>
            <Pilih label="Akun" value={akunId} options={daftar(idx, "akun")} onChange={(v) => set({ akunId: v, subId: "", k1: "" })}
              onKelola={() => onKelola("akun")} />
            <Pilih label="Sub Akun" value={subId} options={daftar(idx, "subAkun", akunId)} onChange={(v) => set({ subId: v, k1: "" })}
              onKelola={() => onKelola("subAkun", akunId)} disabled={!akunId} hint="Pilih Akun terlebih dahulu" />
            <Pilih label="Kas" value={kasId} options={daftar(idx, "kas")} onChange={(v) => set({ kasId: v })}
              onKelola={() => onKelola("kas")} />
          </div>
        </Seksi>

        <Seksi n={2} t="Keterangan">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
              <Pilih label="Keterangan 1" value={k1Id} options={daftar(idx, "ket1", subId)} onChange={(v) => set({ k1: v })}
                onKelola={() => onKelola("ket1", subId)} disabled={!subId} hint="Pilih Sub Akun terlebih dahulu" />
            </div>
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
              <Lbl t="Keterangan 2">
                <input className={box} list="saran-ket2" maxLength={120} placeholder="Ketik manual (boleh kosong)"
                  value={form.ket2} onChange={(e) => set({ ket2: e.target.value })} />
              </Lbl>
              <datalist id="saran-ket2">{saran2.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
              <Lbl t="Keterangan 3">
                <input className={box} list="saran-ket3" maxLength={120} placeholder="Ketik manual (boleh kosong)"
                  value={form.ket3} onChange={(e) => set({ ket3: e.target.value })} />
              </Lbl>
              <datalist id="saran-ket3">{saran3.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </div>
        </Seksi>

        <Seksi n={3} t="Nominal">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Lbl t="Jumlah">
              <input className={box} type="number" inputMode="decimal" min={0} placeholder="0" value={form.jumlah || ""}
                onChange={(e) => set({ jumlah: Math.max(0, Number(e.target.value)) })} />
            </Lbl>
            <Lbl t="Harga (Rp)">
              <input className={box} type="number" inputMode="decimal" min={0} placeholder="0" value={form.harga || ""}
                onChange={(e) => set({ harga: Math.max(0, Number(e.target.value)) })} />
            </Lbl>
            <Lbl t="Total (Jumlah × Harga)">
              <output className="flex min-h-[42px] items-center rounded-xl border border-teal-700 bg-teal-50 px-3 text-base font-bold text-teal-900">{rupiah(total)}</output>
            </Lbl>
          </div>
        </Seksi>

        <div className="mt-6 rounded-xl border border-teal-300 bg-teal-50 p-3 sm:p-4">
          <p className="text-sm font-semibold text-slate-800">Kode transaksi ini</p>
          {kode ? (
            <>
              <p className="mt-1 font-mono text-xl font-bold text-teal-900">{kode}</p>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-slate-800">
                {[akun, sub, k1].map((o) => o?.kode && (
                  <li key={o.id} className="rounded-lg bg-white px-2.5 py-1 ring-1 ring-teal-300">
                    <b className="font-mono text-teal-900">{o.kode}</b> {o.nama}
                  </li>
                ))}
                <li className="rounded-lg bg-white px-2.5 py-1 ring-1 ring-teal-300"><b className="font-mono text-teal-900">{kode.slice(prefix.length + 1)}</b> nomor urut</li>
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-800">Pilih Akun dan Sub Akun untuk melihat kodenya. Kode dibentuk dari singkatan Akun, Sub Akun, dan Keterangan 1, lalu nomor urut.</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={simpan} disabled={!bisa} className={btn}>Simpan ke Tabel Induk</button>
          {!bisa && <p className="text-sm text-slate-700">Lengkapi Tanggal, Akun, Sub Akun, Kas, Jumlah, dan Harga.</p>}
        </div>
      </section>

      <section className={`mt-5 overflow-hidden ${card}`}>
        <h2 className="p-4 text-lg font-bold text-slate-900 sm:px-6">5 Transaksi Terakhir</h2>
        <TabelData rows={recent} highlight={baru} onDelete={onHapus} empty="Belum ada transaksi. Isi formulir di atas untuk mencatat yang pertama." />
      </section>
    </>
  );
}
export default memo(FormCatat);
