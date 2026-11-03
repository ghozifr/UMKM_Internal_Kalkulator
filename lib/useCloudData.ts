"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { kosong, Sinkron } from "./cloud";
import { pesanDb } from "./pesan";
import { rapikan, type Data, type Seq } from "./data";
import { PERS_KOSONG, type Pers } from "./persediaan";
import { SEED, type Opsi, type Transaksi, type Turunan } from "./types";

export type StatusSimpan =
  | { s: "tersimpan" }
  | { s: "menyimpan" }
  | { s: "gagal"; pesan: string; bentrok: boolean };

const TUNDA = 800;
const SEGARKAN_SETELAH = 20_000;
const FLAG = "bk-migrasi";

// Data lama dari versi sebelum ada akun (disimpan di browser)
function bacaLama(): Data | null {
  try {
    const j = <T,>(k: string, d: T): T => { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : d; };
    const opsi = j<Opsi[]>("bk-opsi", []), trx = j<Transaksi[]>("bk-induk", []), turunan = j<Turunan[]>("bk-turunan", []);
    const ada = trx.length > 0 || turunan.length > 0 || (opsi.length > 0 && JSON.stringify(opsi) !== JSON.stringify(SEED));
    if (!ada) return null;
    const r = rapikan(opsi.length ? opsi : SEED, trx);
    return { opsi: r.opsi, trx: r.trx, turunan, seq: j<Seq>("bk-seq2", {}), pers: PERS_KOSONG };
  } catch { return null; }
}

// Data milik satu akun, disimpan di database. Komponen lain memakainya seperti state biasa.
export function useCloudData(db: SupabaseClient, uid: string) {
  const [opsi, setOpsi] = useState<Opsi[]>([]);
  const [trx, setTrx] = useState<Transaksi[]>([]);
  const [turunan, setTurunan] = useState<Turunan[]>([]);
  const [seq, setSeq] = useState<Seq>({});
  const [pers, setPers] = useState<Pers>(PERS_KOSONG);
  const [fase, setFase] = useState<"memuat" | "gagal" | "siap">("memuat");
  const [galat, setGalat] = useState("");
  const [simpan, setSimpan] = useState<StatusSimpan>({ s: "tersimpan" });
  const [lama, setLama] = useState<Data | null>(null);
  const [ulang, setUlang] = useState(0);

  const sk = useRef<Sinkron | null>(null);
  const terbaru = useRef({ opsi, trx, turunan, seq, pers });
  terbaru.current = { opsi, trx, turunan, seq, pers };
  const versi = useRef(0);
  const kotor = useRef(false);
  const jalan = useRef(false);
  const gagalBerturut = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const muatTerakhir = useRef(0);
  const siap = fase === "siap";

  const jadwal = useCallback((ms: number, fn: () => void) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, []);

  const tulis = useCallback(async (): Promise<boolean> => {
    const s = sk.current;
    if (!s) return true;
    if (jalan.current) return false;
    jalan.current = true;
    const v = versi.current;
    let ok = false;
    try {
      const r = s.rencana(terbaru.current);
      if (!kosong(r)) {
        setSimpan({ s: "menyimpan" });
        await s.jalankan(r);
      }
      gagalBerturut.current = 0;
      ok = true;
      if (versi.current === v) { kotor.current = false; setSimpan({ s: "tersimpan" }); }
    } catch (e) {
      gagalBerturut.current++;
      const bentrok = (e as { code?: string })?.code === "23505";
      setSimpan({ s: "gagal", pesan: pesanDb(e as never), bentrok });
      // Coba lagi otomatis dengan jeda yang makin lama, kecuali bentrok (perlu keputusan pengguna)
      if (!bentrok) jadwal(Math.min(30_000, 2000 * 2 ** (gagalBerturut.current - 1)), () => void tulis());
    } finally {
      jalan.current = false;
    }
    if (ok && versi.current !== v) jadwal(300, () => void tulis());
    return ok && versi.current === v;
  }, [jadwal]);

  // Muat pertama (dan saat "Coba lagi" setelah gagal)
  useEffect(() => {
    let batal = false;
    const s = new Sinkron(db, uid);
    sk.current = s;
    setFase("memuat");
    s.ambil().then((h) => {
      if (batal) return;
      s.adopsi(h);
      muatTerakhir.current = Date.now();
      const kosongSemua = !h.opsi.items.length && !h.trx.items.length && !h.turunan.items.length;
      setOpsi(kosongSemua ? SEED : h.opsi.items);
      setTrx(h.trx.items);
      setTurunan(h.turunan.items);
      setSeq(Object.fromEntries(h.seq.items.map((x) => [x.id, x.nomor])));
      setPers(h.pers.items[0]?.data ?? PERS_KOSONG);
      if (kosongSemua) {
        try { if (!localStorage.getItem(FLAG)) setLama(bacaLama()); } catch {}
      }
      setFase("siap");
    }).catch((e) => {
      if (batal) return;
      setGalat(pesanDb(e));
      setFase("gagal");
    });
    return () => { batal = true; clearTimeout(timer.current); };
  }, [db, uid, ulang]);

  // Setiap perubahan data dijadwalkan untuk disimpan
  useEffect(() => {
    if (!siap) return;
    versi.current++;
    kotor.current = true;
    if (!jalan.current && gagalBerturut.current === 0) jadwal(TUNDA, () => void tulis());
  }, [siap, opsi, trx, turunan, seq, pers, jadwal, tulis]);

  // Muat ulang dari server (mis. setelah memakai perangkat lain), hanya bila tidak ada perubahan yang belum tersimpan
  const segarkan = useCallback(async (paksa: boolean) => {
    const s = sk.current;
    if (!s || (!paksa && (kotor.current || jalan.current))) return;
    const v = versi.current;
    try {
      const h = await s.ambil();
      if (!paksa && (versi.current !== v || kotor.current || jalan.current)) return;
      muatTerakhir.current = Date.now();
      if (!paksa && !s.beda(h)) return;
      s.adopsi(h);
      clearTimeout(timer.current);
      gagalBerturut.current = 0;
      setOpsi(h.opsi.items); setTrx(h.trx.items); setTurunan(h.turunan.items);
      setSeq(Object.fromEntries(h.seq.items.map((x) => [x.id, x.nomor])));
      setPers(h.pers.items[0]?.data ?? PERS_KOSONG);
      if (paksa) { kotor.current = false; setSimpan({ s: "tersimpan" }); }
    } catch (e) {
      if (paksa) setSimpan({ s: "gagal", pesan: pesanDb(e as never), bentrok: false });
    }
  }, []);

  useEffect(() => {
    if (!siap) return;
    const lihat = () => {
      if (document.visibilityState === "visible" && Date.now() - muatTerakhir.current > SEGARKAN_SETELAH) void segarkan(false);
    };
    const online = () => { if (kotor.current) { gagalBerturut.current = 0; void tulis(); } };
    document.addEventListener("visibilitychange", lihat);
    window.addEventListener("online", online);
    return () => { document.removeEventListener("visibilitychange", lihat); window.removeEventListener("online", online); };
  }, [siap, segarkan, tulis]);

  // Peringatan bila halaman ditutup saat masih ada yang belum tersimpan
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (kotor.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const coba = useCallback(() => { clearTimeout(timer.current); gagalBerturut.current = 0; void tulis(); }, [tulis]);

  // Dipanggil sebelum keluar akun: menyimpan yang tersisa dan mengembalikan true bila sudah aman
  const simpanSekarang = useCallback(async () => {
    clearTimeout(timer.current);
    for (let i = 0; i < 20 && jalan.current; i++) await new Promise((r) => setTimeout(r, 100));
    return tulis();
  }, [tulis]);

  const tandai = useCallback(() => { try { localStorage.setItem(FLAG, uid); } catch {} setLama(null); }, [uid]);
  const pindahkan = useCallback(() => {
    if (lama) {
      setOpsi(lama.opsi); setTrx(lama.trx); setTurunan(lama.turunan); setSeq(lama.seq); setPers(lama.pers);
    }
    tandai();
  }, [lama, tandai]);

  const src = useMemo(() => ({
    opsi: [opsi, setOpsi] as const, trx: [trx, setTrx] as const,
    turunan: [turunan, setTurunan] as const, seq: [seq, setSeq] as const, pers: [pers, setPers] as const,
  }), [opsi, trx, turunan, seq, pers]);

  return {
    fase, galat, simpan, src, lama,
    muatUlang: () => setUlang((n) => n + 1),
    coba, simpanSekarang, pindahkan, lewati: tandai,
    ambilDariServer: () => segarkan(true),
  };
}
export type Cloud = ReturnType<typeof useCloudData>;
