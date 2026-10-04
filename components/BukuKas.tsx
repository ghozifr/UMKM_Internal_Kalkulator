"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, Download, FilePlus2, FilterX, Layers, PencilLine, Settings2, Table2, Trash2, TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
import { hitung, rupiah } from "@/lib/format";
import { exportExcel } from "@/lib/exportExcel";
import { useLocal } from "@/lib/useLocal";
import { LEVEL_LABEL, PARENT, SEED, type Level, type Opsi, type Tipe, type Transaksi, type Turunan } from "@/lib/types";
import Kelola from "./Kelola";
import Modal from "./Modal";
import { bacaFile, eksporFile, gabung, type Data } from "@/lib/backup";
import TabelData from "./TabelData";

const newId = () => Math.random().toString(36).slice(2, 9);
const hariIni = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
const kodeDari = (n: number) => `TRX-${String(n).padStart(4, "0")}`;
const FIELDS = ["akun", "subAkun", "kas", "ket1", "ket2", "ket3"] as const;
const F0 = { q: "", dari: "", sampai: "", akun: "", subAkun: "", kas: "", ket1: "", ket2: "", ket3: "" };
const BLANK = { tanggal: "", akunId: "", subId: "", kasId: "", k1: "", k2: "", k3: "", jumlah: 0, harga: 0 };
const box =
  "w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-sm transition text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";
const btn = "press inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none";
const btn2 = "press inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:shadow-md";
const card = "anim-up rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.08),0_10px_28px_-14px_rgba(15,23,42,.15)]";

// Angka yang bergerak halus saat nilainya berubah (menghormati prefers-reduced-motion).
function useCountUp(target: number) {
  const [v, setV] = useState(target);
  const dari = useRef(target);
  useEffect(() => {
    const a = dari.current;
    if (a === target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { dari.current = target; setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      const cur = a + (target - a) * (1 - Math.pow(1 - k, 3));
      dari.current = cur;
      setV(cur);
      if (k < 1) raf = requestAnimationFrame(tick); else dari.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}
function Angka({ v }: { v: number }) {
  return <p className="text-xl font-bold tabular-nums text-slate-900">{rupiah(useCountUp(v))}</p>;
}

function Lbl(p: { t: string; children: ReactNode; cls?: string }) {
  return (
    <label className={`block ${p.cls ?? ""}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{p.t}</span>
      {p.children}
    </label>
  );
}

function Seksi(p: { n: number; t: string; children: ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">{p.n}</span>
        {p.t}
      </h3>
      {p.children}
    </div>
  );
}

function Pilih(p: { level: Level; value: string; options: Opsi[]; onChange: (v: string) => void; onKelola: () => void; disabled?: boolean; hint?: string }) {
  const label = LEVEL_LABEL[p.level];
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <button type="button" onClick={p.onKelola} disabled={p.disabled}
          className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline">
          <Settings2 size={14} /> Kelola
        </button>
      </div>
      <select className={box} value={p.value} disabled={p.disabled} onChange={(e) => p.onChange(e.target.value)} aria-label={label}>
        <option value="">{p.disabled ? p.hint : `Pilih ${label}`}</option>
        {p.options.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
      </select>
    </div>
  );
}

export default function BukuKas() {
  const [opsi, setOpsi] = useLocal<Opsi[]>("bk-opsi", SEED);
  const [trx, setTrx] = useLocal<Transaksi[]>("bk-induk", []);
  const [seq, setSeq] = useLocal<number>("bk-seq", 0);
  const [turunan, setTurunan] = useLocal<Turunan[]>("bk-turunan", []);
  const [tab, setTab] = useState<"input" | "induk" | "turunan">("input");
  const [form, setForm] = useState(BLANK);
  const [kelola, setKelola] = useState<{ level: Level; parentId?: string } | null>(null);
  const [info, setInfo] = useState("");
  const [fl, setFl] = useState(F0);
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [namaT, setNamaT] = useState("");
  const [aktif, setAktif] = useState("");
  const [baru, setBaru] = useState("");
  const [impor, setImpor] = useState<Data | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(""), 4000);
    return () => clearTimeout(t);
  }, [info]);

  /* ---------- Pilihan dropdown (CRUD) ---------- */
  const has = (id: string) => (opsi.some((o) => o.id === id) ? id : "");
  const f = { ...form, akunId: has(form.akunId), subId: has(form.subId), kasId: has(form.kasId), k1: has(form.k1), k2: has(form.k2), k3: has(form.k3) };
  const set = (patch: Partial<typeof BLANK>) => setForm((s) => ({ ...s, ...patch }));
  const list = (level: Level, parentId?: string) =>
    opsi.filter((o) => o.level === level && (PARENT[level] ? o.parentId === parentId : true));
  const nm = (id?: string) => opsi.find((o) => o.id === id)?.nama ?? "";
  const sama = (x: Opsi, level: Level, parentId: string | undefined, nama: string) =>
    x.level === level && x.parentId === parentId && x.nama.toLowerCase() === nama.toLowerCase();

  const tambah = (level: Level, parentId: string | undefined, nama: string, tipe: Tipe) =>
    setOpsi((o) => (o.some((x) => sama(x, level, parentId, nama)) ? o
      : [...o, { id: newId(), level, nama, parentId, tipe: level === "akun" ? tipe : undefined }]));
  const ubah = (id: string, patch: Partial<Opsi>) =>
    setOpsi((o) => {
      const cur = o.find((x) => x.id === id);
      if (cur && patch.nama && o.some((x) => x.id !== id && sama(x, cur.level, cur.parentId, patch.nama!))) return o;
      return o.map((x) => (x.id === id ? { ...x, ...patch } : x));
    });
  const hapus = (id: string) =>
    setOpsi((o) => {
      const gone = new Set([id]);
      let n = 0;
      do { n = gone.size; o.forEach((x) => x.parentId && gone.has(x.parentId) && gone.add(x.id)); } while (gone.size !== n);
      return o.filter((x) => !gone.has(x.id));
    });
  const open = (level: Level, parentId?: string) => () => setKelola({ level, parentId });

  /* ---------- Simpan transaksi ke Tabel Induk ---------- */
  const total = hitung(f.jumlah, f.harga);
  const bisaSimpan = !!(f.tanggal && f.akunId && f.subId && f.kasId && total > 0);
  // Nomor kode berikutnya selalu di atas kode terbesar yang ada, jadi tidak pernah bentrok.
  const nextN = trx.reduce((m, t) => Math.max(m, Number(t.kode.slice(4)) || 0), seq) + 1;
  const simpan = () => {
    if (!bisaSimpan) return;
    const n = nextN;
    const id = newId();
    setSeq(n);
    setTrx((t) => [{
      id, kode: kodeDari(n), tanggal: f.tanggal, tipe: opsi.find((o) => o.id === f.akunId)?.tipe ?? "keluar",
      akun: nm(f.akunId), subAkun: nm(f.subId), kas: nm(f.kasId),
      ket1: nm(f.k1), ket2: nm(f.k2), ket3: nm(f.k3), jumlah: f.jumlah, harga: f.harga,
    }, ...t]);
    setInfo(`Transaksi ${kodeDari(n)} tersimpan di Tabel Induk.`);
    setBaru(id);
    setTimeout(() => setBaru(""), 2200);
    setForm({ ...BLANK, tanggal: f.tanggal, kasId: f.kasId });
  };
  const hapusTrx = (t: Transaksi) =>
    confirm(`Hapus ${t.kode}? Baris ini juga hilang dari semua Tabel Turunan.`) && setTrx((x) => x.filter((r) => r.id !== t.id));

  /* ---------- Ringkasan & filter ---------- */
  const sum = (tipe: Tipe) => trx.filter((t) => t.tipe === tipe).reduce((s, t) => s + hitung(t.jumlah, t.harga), 0);
  const masuk = sum("masuk"), keluar = sum("keluar");

  const filtered = useMemo(() => {
    const q = fl.q.trim().toLowerCase();
    return trx.filter((t) =>
      (!q || [t.kode, t.akun, t.subAkun, t.kas, t.ket1, t.ket2, t.ket3].join(" ").toLowerCase().includes(q)) &&
      (!fl.dari || t.tanggal >= fl.dari) && (!fl.sampai || t.tanggal <= fl.sampai) &&
      FIELDS.every((k) => !fl[k] || t[k] === fl[k]));
  }, [trx, fl]);
  const uniq = (k: (typeof FIELDS)[number]) => Array.from(new Set(trx.map((t) => t[k]).filter(Boolean))).sort();

  /* ---------- Tabel Turunan (dibuat dari Kode baris terpilih) ---------- */
  const toggle = (k: string) => setPilih((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleAll = (c: boolean) => setPilih((s) => { const n = new Set(s); filtered.forEach((t) => (c ? n.add(t.kode) : n.delete(t.kode))); return n; });
  const buatTurunan = () => {
    const kodes = trx.filter((t) => pilih.has(t.kode)).map((t) => t.kode);
    if (!kodes.length || !namaT.trim()) return;
    const id = newId();
    setTurunan((x) => [...x, { id, nama: namaT.trim(), kodes }]);
    setAktif(id); setPilih(new Set()); setNamaT(""); setTab("turunan");
  };
  const rowsT = (t: Turunan) => { const s = new Set(t.kodes); return trx.filter((r) => s.has(r.kode)); };
  const at = turunan.find((t) => t.id === aktif) ?? turunan[0];
  const nPilih = useMemo(() => trx.filter((t) => pilih.has(t.kode)).length, [trx, pilih]);

  /* ---------- Cadangkan & impor data ---------- */
  const data = (): Data => ({ opsi, trx, turunan, seq });
  const cadangkan = async () => {
    try { await eksporFile(data()); setInfo("Cadangan data berhasil diunduh."); }
    catch { setInfo("Gagal membuat file cadangan."); }
  };
  const pilihFile = async (file?: File) => {
    if (!file) return;
    try { setImpor(await bacaFile(file)); }
    catch (e) { setInfo(e instanceof Error ? e.message : "File tidak dapat dibaca."); }
    if (fileRef.current) fileRef.current.value = "";
  };
  const terapkan = (mode: "gabung" | "ganti") => {
    if (!impor) return;
    if (mode === "ganti" && !confirm("Semua data saat ini akan diganti dengan isi file. Lanjutkan?")) return;
    const d = mode === "ganti" ? impor : gabung(data(), impor);
    setOpsi(d.opsi); setTrx(d.trx); setTurunan(d.turunan); setSeq(d.seq);
    setPilih(new Set()); setAktif(""); setForm(BLANK); setFl(F0);
    setInfo(`Impor berhasil: ${impor.trx.length} transaksi dibaca dari file.`);
    setImpor(null);
  };

  const TABS = [
    ["input", "Catat Transaksi", "Catat", PencilLine, ""],
    ["induk", "Tabel Induk", "Induk", Table2, trx.length],
    ["turunan", "Tabel Turunan", "Turunan", Layers, turunan.length],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="anim-up mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/30"><BookOpen size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buku Kas UMKM</h1>
            <p className="text-sm text-slate-700">Catat transaksi, kumpulkan di Tabel Induk, lalu buat Tabel Turunan dari kode baris.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className={btn2} onClick={cadangkan}><Download size={16} /> Cadangkan Data</button>
          <button className={btn2} onClick={() => fileRef.current?.click()}><Upload size={16} /> Impor Data</button>
          <input ref={fileRef} type="file" accept=".bkas,.json,.gz" className="hidden" onChange={(e) => pilihFile(e.target.files?.[0])} />
        </div>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { l: "Total Pemasukan", v: masuk, i: <TrendingUp size={20} />, c: "bg-emerald-100 text-emerald-800" },
          { l: "Total Pengeluaran", v: keluar, i: <TrendingDown size={20} />, c: "bg-rose-100 text-rose-800" },
          { l: "Saldo", v: masuk - keluar, i: <Wallet size={20} />, c: "bg-teal-100 text-teal-800" },
        ].map((x, idx) => (
          <div key={x.l} style={{ animationDelay: `${idx * 70}ms` }} className={`lift flex items-center gap-3 p-4 ${card}`}>
            <div className={`rounded-xl p-2.5 ${x.c}`}>{x.i}</div>
            <div><p className="text-sm text-slate-700">{x.l}</p><Angka v={x.v} /></div>
          </div>
        ))}
      </div>

      <nav className="sticky top-2 z-10 mb-5 rounded-2xl border border-slate-200 bg-white/85 p-1.5 shadow-sm backdrop-blur">
        <div className="relative grid grid-cols-3">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1/3 rounded-xl bg-teal-700 shadow-md transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${TABS.findIndex((x) => x[0] === tab) * 100}%)` }} />
          {TABS.map(([k, full, short, Icon, count]) => (
            <button key={k} onClick={() => setTab(k)} aria-current={tab === k}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${tab === k ? "text-white" : "text-slate-700 hover:text-slate-900"}`}>
              <Icon size={16} className="shrink-0" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{full}</span>
              {count !== "" && <span className={`rounded-full px-2 text-xs transition-colors ${tab === k ? "bg-white/25" : "bg-slate-200 text-slate-800"}`}>{count}</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* ================= CATAT TRANSAKSI ================= */}
      {tab === "input" && (
        <>
          <section className={`p-4 sm:p-6 ${card}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Catat Transaksi</h2>
              <p className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-800">
                Kode berikutnya: <b className="font-mono text-teal-800">{kodeDari(nextN)}</b>
              </p>
            </div>

            <Seksi n={1} t="Tanggal dan Akun">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Lbl t="Tanggal">
                  <input type="date" className={box} value={f.tanggal} onChange={(e) => set({ tanggal: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); set({ tanggal: hariIni() }); } }} />
                  <span className="mt-1 block text-sm text-slate-600">Tekan Enter untuk mengisi tanggal hari ini.</span>
                </Lbl>
                <Pilih level="kas" value={f.kasId} options={list("kas")} onChange={(v) => set({ kasId: v })} onKelola={open("kas")} />
                <Pilih level="akun" value={f.akunId} options={list("akun")} onChange={(v) => set({ akunId: v, subId: "", k1: "" })} onKelola={open("akun")} />
                <Pilih level="subAkun" value={f.subId} options={list("subAkun", f.akunId)} onChange={(v) => set({ subId: v, k1: "" })}
                  onKelola={open("subAkun", f.akunId)} disabled={!f.akunId} hint="Pilih Akun terlebih dahulu" />
              </div>
            </Seksi>

            <Seksi n={2} t="Keterangan">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <Pilih level="ket1" value={f.k1} options={list("ket1", f.subId)} onChange={(v) => set({ k1: v })}
                    onKelola={open("ket1", f.subId)} disabled={!f.subId} hint="Pilih Sub Akun terlebih dahulu" />
                </div>
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <Pilih level="ket2" value={f.k2} options={list("ket2")} onChange={(v) => set({ k2: v })} onKelola={open("ket2")} />
                </div>
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                  <Pilih level="ket3" value={f.k3} options={list("ket3")} onChange={(v) => set({ k3: v })} onKelola={open("ket3")} />
                </div>
              </div>
            </Seksi>

            <Seksi n={3} t="Nominal">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Lbl t="Jumlah">
                  <input className={box} type="number" inputMode="decimal" min={0} placeholder="0" value={f.jumlah || ""}
                    onChange={(e) => set({ jumlah: Math.max(0, Number(e.target.value)) })} />
                </Lbl>
                <Lbl t="Harga (Rp)">
                  <input className={box} type="number" inputMode="decimal" min={0} placeholder="0" value={f.harga || ""}
                    onChange={(e) => set({ harga: Math.max(0, Number(e.target.value)) })} />
                </Lbl>
                <Lbl t="Total (Jumlah × Harga)">
                  <output className="flex min-h-[42px] items-center rounded-lg border border-teal-700 bg-teal-50 px-3 text-base font-bold text-teal-900">{rupiah(total)}</output>
                </Lbl>
              </div>
            </Seksi>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button onClick={simpan} disabled={!bisaSimpan} className={btn}>Simpan ke Tabel Induk</button>
              {!bisaSimpan && <p className="text-sm text-slate-700">Lengkapi Tanggal, Akun, Sub Akun, Kas, Jumlah, dan Harga.</p>}
            </div>
          </section>

          <section className={`mt-5 overflow-hidden ${card}`}>
            <h2 className="p-4 text-lg font-bold text-slate-900 sm:px-6">5 Transaksi Terakhir</h2>
            <TabelData rows={trx.slice(0, 5)} highlight={baru} onDelete={hapusTrx} empty="Belum ada transaksi. Isi formulir di atas untuk mencatat yang pertama." />
          </section>
        </>
      )}

      {/* ================= TABEL INDUK ================= */}
      {tab === "induk" && (
        <section className={`overflow-hidden ${card}`}>
          <div className="border-b border-slate-300 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tabel Induk</h2>
                <p className="text-sm text-slate-700">Semua transaksi ada di sini. Saring data, centang baris berdasarkan Kode, lalu buat Tabel Turunan.</p>
              </div>
              <button className={btn} disabled={!trx.length}
                onClick={() => exportExcel([{ nama: "Tabel Induk", rows: trx }, ...turunan.map((t) => ({ nama: t.nama, rows: rowsT(t) }))], "Buku-Kas.xlsx")}>
                <Download size={16} /> Unduh Excel
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Lbl t="Cari (kode atau teks)" cls="lg:col-span-2">
                <input className={box} placeholder="Contoh: TRX-0003 atau Pisang" value={fl.q} onChange={(e) => setFl({ ...fl, q: e.target.value })} />
              </Lbl>
              <Lbl t="Dari tanggal"><input type="date" className={box} value={fl.dari} onChange={(e) => setFl({ ...fl, dari: e.target.value })} /></Lbl>
              <Lbl t="Sampai tanggal"><input type="date" className={box} value={fl.sampai} onChange={(e) => setFl({ ...fl, sampai: e.target.value })} /></Lbl>
              {FIELDS.map((k) => (
                <Lbl key={k} t={LEVEL_LABEL[k]}>
                  <select className={box} value={fl[k]} onChange={(e) => setFl({ ...fl, [k]: e.target.value })}>
                    <option value="">Semua</option>
                    {uniq(k).map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </Lbl>
              ))}
              <div className="flex items-end">
                <button onClick={() => setFl(F0)} className="inline-flex items-center gap-2 rounded-lg border border-slate-400 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                  <FilterX size={16} /> Reset Filter
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-700">Menampilkan <b>{filtered.length}</b> dari <b>{trx.length}</b> transaksi.</p>
          </div>

          <TabelData rows={filtered} highlight={baru} selected={pilih} onToggle={toggle} onToggleAll={toggleAll} onDelete={hapusTrx}
            empty={trx.length ? "Tidak ada transaksi yang cocok dengan filter." : "Tabel Induk masih kosong. Catat transaksi terlebih dahulu."} />

          <div className="flex flex-wrap items-end gap-3 border-t border-slate-300 bg-slate-50 p-4 sm:px-6">
            <p className="w-full text-sm text-slate-800">
              <b>{nPilih}</b> baris dipilih. Centang kotak di header tabel untuk memilih semua baris hasil filter.
            </p>
            <Lbl t="Nama Tabel Turunan" cls="min-w-[220px] flex-1">
              <input className={box} placeholder="Contoh: Pembelian Bahan Baku Oktober" value={namaT} onChange={(e) => setNamaT(e.target.value)} />
            </Lbl>
            <button className={btn} onClick={buatTurunan} disabled={!nPilih || !namaT.trim()}>
              <FilePlus2 size={16} /> Buat Tabel Turunan
            </button>
          </div>
        </section>
      )}

      {/* ================= TABEL TURUNAN ================= */}
      {tab === "turunan" && (
        <section className={`overflow-hidden ${card}`}>
          <div className="border-b border-slate-300 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Tabel Turunan</h2>
            <p className="text-sm text-slate-700">Setiap tabel hanya menyimpan Kode baris dari Tabel Induk, jadi datanya selalu mengikuti Tabel Induk.</p>
            {turunan.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {turunan.map((t) => (
                  <button key={t.id} onClick={() => setAktif(t.id)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${t.id === at?.id ? "border-teal-700 bg-teal-700 text-white" : "border-slate-400 bg-white text-slate-800 hover:bg-slate-100"}`}>
                    {t.nama} ({rowsT(t).length})
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
                    onBlur={(e) => { const v = e.target.value.trim(); if (v) setTurunan((x) => x.map((t) => (t.id === at.id ? { ...t, nama: v } : t))); else e.target.value = at.nama; }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
                </Lbl>
                <button className={btn} onClick={() => exportExcel([{ nama: at.nama, rows: rowsT(at) }], `${at.nama}.xlsx`)}>
                  <Download size={16} /> Unduh Excel
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-rose-700 bg-white px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-50"
                  onClick={() => { if (confirm(`Hapus tabel "${at.nama}"? Data di Tabel Induk tidak terhapus.`)) { setTurunan((x) => x.filter((t) => t.id !== at.id)); setAktif(""); } }}>
                  <Trash2 size={16} /> Hapus Tabel
                </button>
              </div>
              <TabelData rows={rowsT(at)} deleteLabel="Keluarkan dari tabel ini"
                onDelete={(r) => setTurunan((x) => x.map((t) => (t.id === at.id ? { ...t, kodes: t.kodes.filter((k) => k !== r.kode) } : t)))}
                empty="Tabel ini kosong karena baris-barisnya sudah dihapus dari Tabel Induk." />
            </>
          )}
        </section>
      )}

      {impor && (
        <Modal title="Impor Data" subtitle="File cadangan berhasil dibaca." onClose={() => setImpor(null)}>
          <ul className="space-y-1 text-sm text-slate-800">
            <li><b>{impor.trx.length}</b> transaksi</li>
            <li><b>{impor.turunan.length}</b> tabel turunan</li>
            <li><b>{impor.opsi.length}</b> pilihan dropdown</li>
          </ul>
          <p className="mt-3 text-sm text-slate-700">
            <b>Gabungkan</b> menambahkan data dari file tanpa menghapus data sekarang (kode yang bentrok diberi nomor baru).{" "}
            <b>Ganti Semua</b> menghapus data sekarang dan memakai isi file.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btn} onClick={() => terapkan("gabung")}>Gabungkan</button>
            <button className={btn2} onClick={() => terapkan("ganti")}>Ganti Semua</button>
          </div>
        </Modal>
      )}

      {info && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div role="status" className="anim-pop rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">{info}</div>
        </div>
      )}

      {kelola && (
        <Kelola level={kelola.level} parentLabel={kelola.parentId ? nm(kelola.parentId) : undefined} items={list(kelola.level, kelola.parentId)}
          onAdd={(n, t) => tambah(kelola.level, kelola.parentId, n, t)}
          onRename={(id, n) => ubah(id, { nama: n })} onTipe={(id, t) => ubah(id, { tipe: t })}
          onDelete={hapus} onClose={() => setKelola(null)} />
      )}
    </div>
  );
}
