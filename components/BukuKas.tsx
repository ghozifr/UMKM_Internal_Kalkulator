"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Layers, ListTree, PencilLine, Table2, TrendingDown, TrendingUp, Upload, Wallet, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { daftar, type Data } from "@/lib/data";
import type { Level, Transaksi } from "@/lib/types";
import FormCatat from "./FormCatat";
import Modal from "./Modal";
import { Angka, btn, btn2, card } from "./ui";

// Bagian yang tidak langsung terlihat dimuat saat dibutuhkan, jadi halaman pertama lebih ringan.
const loadInduk = () => import("./TabInduk");
const loadSub = () => import("./TabSubAkun");
const loadTurunan = () => import("./TabTurunan");
const TabInduk = dynamic(loadInduk);
const TabSubAkun = dynamic(loadSub);
const TabTurunan = dynamic(loadTurunan);
const Kelola = dynamic(() => import("./Kelola"));

type TabKey = "input" | "induk" | "sub" | "turunan";
const TABS: { k: TabKey; full: string; short: string; Icon: LucideIcon; load?: () => unknown }[] = [
  { k: "input", full: "Catat Transaksi", short: "Catat", Icon: PencilLine },
  { k: "induk", full: "Tabel Induk", short: "Induk", Icon: Table2, load: loadInduk },
  { k: "sub", full: "Tabel Sub Akun", short: "Sub Akun", Icon: ListTree, load: loadSub },
  { k: "turunan", full: "Tabel Turunan", short: "Turunan", Icon: Layers, load: loadTurunan },
];

export default function BukuKas() {
  const s = useStore();
  const [tab, setTab] = useState<TabKey>("input");
  // Tab dibuat saat pertama dibuka lalu dipertahankan, jadi filter dan pilihan Anda tidak hilang saat pindah tab.
  const [dibuka, setDibuka] = useState<ReadonlySet<TabKey>>(new Set(["input"]));
  const [kelola, setKelola] = useState<{ level: Level; parentId?: string } | null>(null);
  const [info, setInfo] = useState("");
  const [baru, setBaru] = useState("");
  const [impor, setImpor] = useState<Data | null>(null);
  const [aktifT, setAktifT] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!info) return;
    const t = setTimeout(() => setInfo(""), 4000);
    return () => clearTimeout(t);
  }, [info]);
  useEffect(() => {
    if (!baru) return;
    const t = setTimeout(() => setBaru(""), 2200);
    return () => clearTimeout(t);
  }, [baru]);

  const buka = useCallback((k: TabKey) => {
    setTab(k);
    setDibuka((d) => (d.has(k) ? d : new Set(d).add(k)));
  }, []);
  const bukaKelola = useCallback((level: Level, parentId?: string) => setKelola({ level, parentId }), []);
  const onSimpan = useCallback((pesan: string, id: string) => { setInfo(pesan); setBaru(id); }, []);

  const { hapusTrx, buatTurunan } = s;
  const hapusKonfirm = useCallback((t: Transaksi) => {
    if (confirm(`Hapus ${t.kode}? Baris ini juga hilang dari semua tabel.`)) hapusTrx(t.id);
  }, [hapusTrx]);
  const onBuat = useCallback((nama: string, kodes: string[]) => {
    setAktifT(buatTurunan(nama, kodes));
    buka("turunan");
  }, [buatTurunan, buka]);

  const jmlSub = useMemo(() => s.opsi.reduce((n, o) => n + (o.level === "subAkun" ? 1 : 0), 0), [s.opsi]);
  const hitungTab: Record<TabKey, number | undefined> = { input: undefined, induk: s.trx.length, sub: jmlSub, turunan: s.turunan.length };

  /* ---------- Cadangkan & impor data ---------- */
  const cadangkan = async () => {
    try {
      const { eksporFile } = await import("@/lib/backup");
      await eksporFile(s.ambil());
      setInfo("Cadangan data berhasil diunduh.");
    } catch { setInfo("Gagal membuat file cadangan."); }
  };
  const pilihFile = async (file?: File) => {
    if (!file) return;
    try {
      const { bacaFile } = await import("@/lib/backup");
      setImpor(await bacaFile(file));
    } catch (e) { setInfo(e instanceof Error ? e.message : "File tidak dapat dibaca."); }
    if (fileRef.current) fileRef.current.value = "";
  };
  const terapkan = (mode: "gabung" | "ganti") => {
    if (!impor) return;
    if (mode === "ganti" && !confirm("Semua data saat ini akan diganti dengan isi file. Lanjutkan?")) return;
    s.impor(impor, mode);
    setAktifT("");
    setInfo(`Impor berhasil: ${impor.trx.length} transaksi dibaca dari file.`);
    setImpor(null);
  };

  const ringkasan = [
    { l: "Total Pemasukan", v: s.total.masuk, i: <TrendingUp size={20} />, c: "bg-emerald-100 text-emerald-800" },
    { l: "Total Pengeluaran", v: s.total.keluar, i: <TrendingDown size={20} />, c: "bg-rose-100 text-rose-800" },
    { l: "Saldo", v: s.total.masuk - s.total.keluar, i: <Wallet size={20} />, c: "bg-teal-100 text-teal-800" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="anim-up mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-700/30"><BookOpen size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buku Kas UMKM</h1>
            <p className="text-sm text-slate-700">Catat transaksi, kumpulkan di Tabel Induk, lalu lihat per Sub Akun atau buat Tabel Turunan.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className={btn2} onClick={cadangkan}><Download size={16} /> Cadangkan Data</button>
          <button className={btn2} onClick={() => fileRef.current?.click()}><Upload size={16} /> Impor Data</button>
          <input ref={fileRef} type="file" accept=".bkas,.json,.gz" className="hidden" onChange={(e) => pilihFile(e.target.files?.[0])} />
        </div>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ringkasan.map((x, i) => (
          <div key={x.l} style={{ animationDelay: `${i * 70}ms` }} className={`lift flex items-center gap-3 p-4 ${card}`}>
            <div className={`rounded-xl p-2.5 ${x.c}`}>{x.i}</div>
            <div><p className="text-sm text-slate-700">{x.l}</p><Angka v={x.v} /></div>
          </div>
        ))}
      </div>

      <nav className="sticky top-2 z-10 mb-5 rounded-2xl border border-slate-200 bg-white/85 p-1.5 shadow-sm backdrop-blur">
        <div className="relative grid grid-cols-4">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1/4 rounded-xl bg-teal-700 shadow-md transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${TABS.findIndex((x) => x.k === tab) * 100}%)` }} />
          {TABS.map(({ k, full, short, Icon, load }) => (
            <button key={k} onClick={() => buka(k)} onPointerEnter={load} onFocus={load} aria-current={tab === k}
              className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-xs font-semibold transition-colors sm:flex-row sm:gap-2 sm:px-2 sm:py-2.5 sm:text-sm ${tab === k ? "text-white" : "text-slate-700 hover:text-slate-900"}`}>
              <Icon size={16} className="shrink-0" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{full}</span>
              {hitungTab[k] !== undefined && (
                <span className={`hidden rounded-full px-2 text-xs transition-colors sm:inline ${tab === k ? "bg-white/25" : "bg-slate-200 text-slate-800"}`}>{hitungTab[k]}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div hidden={tab !== "input"}>
        <FormCatat idx={s.idx} trx={s.trx} baru={baru} kodeBerikut={s.kodeBerikut} simpanTrx={s.simpanTrx}
          onHapus={hapusKonfirm} onKelola={bukaKelola} onSimpan={onSimpan} />
      </div>
      {dibuka.has("induk") && (
        <div hidden={tab !== "induk"}>
          <TabInduk trx={s.trx} turunan={s.turunan} opsi={s.opsi} byKode={s.byKode} baru={baru} onHapus={hapusKonfirm} onBuat={onBuat} />
        </div>
      )}
      {dibuka.has("sub") && (
        <div hidden={tab !== "sub"}>
          <TabSubAkun opsi={s.opsi} trx={s.trx} baru={baru} onHapus={hapusKonfirm} onKelola={bukaKelola} />
        </div>
      )}
      {dibuka.has("turunan") && (
        <div hidden={tab !== "turunan"}>
          <TabTurunan turunan={s.turunan} byKode={s.byKode} aktif={aktifT} onAktif={setAktifT} onRename={s.ubahNamaTurunan}
            onKeluarkan={s.keluarkanKode} onHapus={s.hapusTurunan} />
        </div>
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

      {kelola && (
        <Kelola level={kelola.level} parentLabel={kelola.parentId ? s.idx.byId.get(kelola.parentId)?.nama : undefined}
          items={daftar(s.idx, kelola.level, kelola.parentId)}
          onAdd={(nama, tipe) => s.tambahOpsi(kelola.level, kelola.parentId, nama, tipe)}
          onRename={(id, nama) => s.ubahNama(kelola.level, id, nama)}
          onKode={s.ubahKode} onTipe={s.ubahTipe} onDelete={s.hapusOpsi} onClose={() => setKelola(null)} />
      )}

      {info && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div role="status" className="anim-pop rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">{info}</div>
        </div>
      )}
    </div>
  );
}
