"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AlertTriangle, BookOpen, Boxes, Check, CloudUpload, Download, Factory, Layers, ListTree, Loader2, LogOut, PencilLine, Table2, TrendingDown, TrendingUp, Upload, Wallet, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Cloud } from "@/lib/useCloudData";
import { daftar, type Data } from "@/lib/data";
import type { Level, Transaksi } from "@/lib/types";
import FormCatat from "./FormCatat";
import Modal from "./Modal";
import { Angka, btn, btn2, card } from "./ui";

// Bagian yang tidak langsung terlihat dimuat saat dibutuhkan, jadi halaman pertama lebih ringan.
const loadInduk = () => import("./TabInduk");
const loadSub = () => import("./TabSubAkun");
const loadTurunan = () => import("./TabTurunan");
const loadProduksi = () => import("./TabProduksi");
const loadPers = () => import("./TabPersediaan");
const TabInduk = dynamic(loadInduk);
const TabSubAkun = dynamic(loadSub);
const TabTurunan = dynamic(loadTurunan);
const TabProduksi = dynamic(loadProduksi);
const TabPersediaan = dynamic(loadPers);
const Kelola = dynamic(() => import("./Kelola"));

type TabKey = "input" | "induk" | "sub" | "turunan" | "produksi" | "persediaan";
const TABS: { k: TabKey; full: string; short: string; Icon: LucideIcon; load?: () => unknown }[] = [
  { k: "input", full: "Catat Transaksi", short: "Catat", Icon: PencilLine },
  { k: "induk", full: "Tabel Induk", short: "Induk", Icon: Table2, load: loadInduk },
  { k: "sub", full: "Tabel Sub Akun", short: "Sub Akun", Icon: ListTree, load: loadSub },
  { k: "turunan", full: "Tabel Turunan", short: "Turunan", Icon: Layers, load: loadTurunan },
  { k: "produksi", full: "Tabel Produksi", short: "Produksi", Icon: Factory, load: loadProduksi },
  { k: "persediaan", full: "Persediaan", short: "Stok", Icon: Boxes, load: loadPers },
];

export default function BukuKas({ user, cloud, onKeluar }: { user: User; cloud: Cloud; onKeluar: () => Promise<void> }) {
  const s = useStore(cloud.src);
  const [keluar, setKeluar] = useState(false);
  const [tabDipilih, setTab] = useState<TabKey>("input");
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

  // Tab Produksi hanya muncul bila ada Akun yang ditandai sebagai akun produksi
  const adaProduksi = useMemo(() => s.opsi.some((o) => o.level === "akun" && o.produksi), [s.opsi]);
  const tabs = useMemo(() => TABS.filter((x) => x.k !== "produksi" || adaProduksi), [adaProduksi]);
  const tab = tabs.some((x) => x.k === tabDipilih) ? tabDipilih : "input";

  const jmlSub = useMemo(() => s.opsi.reduce((n, o) => n + (o.level === "subAkun" ? 1 : 0), 0), [s.opsi]);
  const hitungTab: Record<TabKey, number | undefined> = { input: undefined, induk: s.trx.length, sub: jmlSub, turunan: s.turunan.length, produksi: undefined, persediaan: undefined };

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

  const proses = async () => {
    setKeluar(true);
    const aman = await cloud.simpanSekarang();
    if (!aman && !confirm("Ada perubahan yang belum tersimpan ke server dan akan hilang. Tetap keluar?")) { setKeluar(false); return; }
    await onKeluar();
  };
  const usaha = typeof user.user_metadata?.nama_usaha === "string" ? user.user_metadata.nama_usaha : "";
  const sy = cloud.simpan;

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 text-right text-xs leading-tight text-slate-700">
            <p className="max-w-[14rem] truncate font-semibold text-slate-900" title={user.email}>{usaha || user.email}</p>
            <p aria-live="polite" className={`mt-0.5 inline-flex items-center gap-1 ${sy.s === "gagal" ? "text-rose-800" : "text-slate-700"}`}>
              {sy.s === "tersimpan" && <><Check size={13} className="text-emerald-700" /> Tersimpan di akun</>}
              {sy.s === "menyimpan" && <><Loader2 size={13} className="animate-spin" /> Menyimpan…</>}
              {sy.s === "gagal" && <><CloudUpload size={13} /> Belum tersimpan</>}
            </p>
          </div>
          <button className={btn2} onClick={cadangkan}><Download size={16} /> Cadangkan Data</button>
          <button className={btn2} onClick={() => fileRef.current?.click()}><Upload size={16} /> Impor Data</button>
          <input ref={fileRef} type="file" accept=".bkas,.json,.gz" className="hidden" onChange={(e) => pilihFile(e.target.files?.[0])} />
          <button className={btn2} onClick={proses} disabled={keluar}><LogOut size={16} /> Keluar</button>
        </div>
      </header>

      {sy.s === "gagal" && (
        <div role="alert" className="anim-up mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-950">
          <AlertTriangle className="shrink-0" size={20} />
          <p className="min-w-0 flex-1">{sy.pesan}{!sy.bentrok && " Data tetap aman di layar ini dan dicoba disimpan lagi otomatis."}</p>
          <button className={btn2} onClick={cloud.coba}>Coba lagi</button>
          {sy.bentrok && (
            <button className={btn2} onClick={() => { if (confirm("Perubahan yang belum tersimpan di layar ini akan dibuang dan diganti data dari server. Lanjutkan?")) void cloud.ambilDariServer(); }}>
              Muat ulang dari server
            </button>
          )}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ringkasan.map((x, i) => (
          <div key={x.l} style={{ animationDelay: `${i * 70}ms` }} className={`lift flex items-center gap-3 p-4 ${card}`}>
            <div className={`rounded-xl p-2.5 ${x.c}`}>{x.i}</div>
            <div><p className="text-sm text-slate-700">{x.l}</p><Angka v={x.v} /></div>
          </div>
        ))}
      </div>

      <nav className="sticky top-2 z-10 mb-5 rounded-2xl border border-slate-200 bg-white/85 p-1.5 shadow-sm backdrop-blur">
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-xl bg-teal-700 shadow-md transition-transform duration-300 ease-out"
            style={{ width: `${100 / tabs.length}%`, transform: `translateX(${tabs.findIndex((x) => x.k === tab) * 100}%)` }} />
          {tabs.map(({ k, full, short, Icon, load }) => (
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

      {dibuka.has("produksi") && adaProduksi && (
        <div hidden={tab !== "produksi"}>
          <TabProduksi opsi={s.opsi} trx={s.trx} baru={baru} onHapus={hapusKonfirm} />
        </div>
      )}
      {dibuka.has("persediaan") && (
        <div hidden={tab !== "persediaan"}>
          <TabPersediaan pers={s.pers} setPers={s.setPers} trx={s.trx} opsi={s.opsi} idx={s.idx} />
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
            <b>Ganti Semua</b> menghapus data sekarang dan memakai isi file. Pengaturan Persediaan dari file hanya dipakai bila Persediaan Anda masih kosong.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btn} onClick={() => terapkan("gabung")}>Gabungkan</button>
            <button className={btn2} onClick={() => terapkan("ganti")}>Ganti Semua</button>
          </div>
        </Modal>
      )}

      {cloud.lama && (
        <Modal title="Data lama ditemukan" subtitle="Ada data buku kas yang tersimpan di browser ini sebelum Anda memakai akun." onClose={cloud.lewati}>
          <ul className="space-y-1 text-sm text-slate-800">
            <li><b>{cloud.lama.trx.length}</b> transaksi</li>
            <li><b>{cloud.lama.turunan.length}</b> tabel turunan</li>
          </ul>
          <p className="mt-3 text-sm text-slate-700">Pindahkan ke akun ini agar bisa dibuka dari perangkat mana pun? Data lama di browser tidak dihapus.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={btn} onClick={() => { cloud.pindahkan(); setInfo("Data lama dipindahkan ke akun Anda."); }}>Pindahkan ke akun</button>
            <button className={btn2} onClick={cloud.lewati}>Mulai dari kosong</button>
          </div>
        </Modal>
      )}

      {kelola && (
        <Kelola level={kelola.level} parentLabel={kelola.parentId ? s.idx.byId.get(kelola.parentId)?.nama : undefined}
          items={daftar(s.idx, kelola.level, kelola.parentId)}
          onAdd={(nama, tipe, produksi) => s.tambahOpsi(kelola.level, kelola.parentId, nama, tipe, produksi)}
          onRename={(id, nama) => s.ubahNama(kelola.level, id, nama)}
          onKode={s.ubahKode} onTipe={s.ubahTipe} onProduksi={s.ubahProduksi} onDelete={s.hapusOpsi} onClose={() => setKelola(null)} />
      )}

      {info && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div role="status" className="anim-pop rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">{info}</div>
        </div>
      )}
    </div>
  );
}
