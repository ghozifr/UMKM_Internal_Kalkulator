"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useLocal } from "./useLocal";
import { hitung } from "./format";
import { BERKODE, SEED, type Level, type Opsi, type Tipe, type Transaksi, type Turunan } from "./types";
import { formatKode, nomorTerbesar, prefixKode, singkat } from "./kode";
import {
  daftar, gabung, hapusCascade, indeks, newId, rapikan, ubahTeks, ubahTipeTrx, type Data, type Seq,
} from "./data";

export type Input = {
  tanggal: string; akunId: string; subId: string; kasId: string; k1Id: string;
  ket2: string; ket3: string; jumlah: number; harga: number;
};

// Satu-satunya tempat data aplikasi hidup. Komponen hanya membaca data dan memanggil aksi di sini.
export function useStore() {
  const [opsi, setOpsi] = useLocal<Opsi[]>("bk-opsi", SEED);
  const [trx, setTrx] = useLocal<Transaksi[]>("bk-induk", []);
  const [turunan, setTurunan] = useLocal<Turunan[]>("bk-turunan", []);
  const [seq, setSeq] = useLocal<Seq>("bk-seq2", {});

  // Rapikan data dari versi lama (singkatan kode, id pilihan pada transaksi)
  useEffect(() => {
    const r = rapikan(opsi, trx);
    if (r.opsi !== opsi) setOpsi(r.opsi);
    if (r.trx !== trx) setTrx(r.trx);
  }, [opsi, trx, setOpsi, setTrx]);

  const idx = useMemo(() => indeks(opsi), [opsi]);
  const byKode = useMemo(() => new Map(trx.map((t) => [t.kode, t])), [trx]);
  const mx = useMemo(() => nomorTerbesar(trx), [trx]);
  const total = useMemo(() => {
    let masuk = 0, keluar = 0;
    for (const t of trx) {
      const v = hitung(t.jumlah, t.harga);
      if (t.tipe === "masuk") masuk += v;
      else keluar += v;
    }
    return { masuk, keluar };
  }, [trx]);

  /* ---------- Pilihan dropdown ---------- */
  const tambahOpsi = useCallback((level: Level, parentId: string | undefined, nama: string, tipe: Tipe) => {
    setOpsi((o) => {
      const saudara = o.filter((x) => x.level === level && x.parentId === parentId);
      if (saudara.some((x) => x.nama.toLowerCase() === nama.toLowerCase())) return o;
      const baru: Opsi = { id: newId(), level, nama, parentId };
      if (BERKODE.includes(level)) baru.kode = singkat(nama, new Set(saudara.flatMap((x) => (x.kode ? [x.kode] : []))));
      if (level === "akun") baru.tipe = tipe;
      return [...o, baru];
    });
  }, [setOpsi]);

  const ubahNama = useCallback((level: Level, id: string, nama: string) => {
    const cur = idx.byId.get(id);
    if (!cur || cur.nama === nama) return;
    if (daftar(idx, level, cur.parentId).some((x) => x.id !== id && x.nama.toLowerCase() === nama.toLowerCase())) return;
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, nama } : x)));
    setTrx((t) => ubahTeks(t, level, id, nama));
  }, [idx, setOpsi, setTrx]);

  const ubahKode = useCallback((id: string, kode: string) => {
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, kode } : x)));
  }, [setOpsi]);

  const ubahTipe = useCallback((id: string, tipe: Tipe) => {
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, tipe } : x)));
    setTrx((t) => ubahTipeTrx(t, id, tipe));
  }, [setOpsi, setTrx]);

  const hapusOpsi = useCallback((id: string) => setOpsi((o) => hapusCascade(o, id)), [setOpsi]);

  /* ---------- Transaksi ---------- */
  const kodeBerikut = useCallback((prefix: string) => {
    let n = Math.max(seq[prefix] ?? 0, mx.get(prefix) ?? 0) + 1;
    let kode = formatKode(prefix, n);
    while (byKode.has(kode)) kode = formatKode(prefix, ++n);
    return { kode, n };
  }, [seq, mx, byKode]);

  const simpanTrx = useCallback((f: Input): Transaksi | null => {
    const akun = idx.byId.get(f.akunId), sub = idx.byId.get(f.subId), kas = idx.byId.get(f.kasId);
    const k1 = f.k1Id ? idx.byId.get(f.k1Id) : undefined;
    if (!akun || !sub || !kas) return null;
    const prefix = prefixKode(akun, sub, k1);
    const { kode, n } = kodeBerikut(prefix);
    const t: Transaksi = {
      id: newId(), kode, tanggal: f.tanggal, tipe: akun.tipe ?? "keluar",
      akun: akun.nama, subAkun: sub.nama, kas: kas.nama, ket1: k1?.nama ?? "",
      ket2: f.ket2.trim(), ket3: f.ket3.trim(), jumlah: f.jumlah, harga: f.harga,
      aid: akun.id, sid: sub.id, kid: kas.id, k1id: k1?.id ?? "",
    };
    setTrx((x) => [t, ...x]);
    setSeq((s) => ({ ...s, [prefix]: n }));
    return t;
  }, [idx, kodeBerikut, setTrx, setSeq]);

  const hapusTrx = useCallback((id: string) => setTrx((x) => x.filter((r) => r.id !== id)), [setTrx]);

  /* ---------- Tabel turunan ---------- */
  const buatTurunan = useCallback((nama: string, kodes: string[]) => {
    const id = newId();
    setTurunan((x) => [...x, { id, nama, kodes }]);
    return id;
  }, [setTurunan]);
  const ubahNamaTurunan = useCallback((id: string, nama: string) =>
    setTurunan((x) => x.map((t) => (t.id === id ? { ...t, nama } : t))), [setTurunan]);
  const keluarkanKode = useCallback((id: string, kode: string) =>
    setTurunan((x) => x.map((t) => (t.id === id ? { ...t, kodes: t.kodes.filter((k) => k !== kode) } : t))), [setTurunan]);
  const hapusTurunan = useCallback((id: string) => setTurunan((x) => x.filter((t) => t.id !== id)), [setTurunan]);

  /* ---------- Cadangan ---------- */
  const ambil = useCallback((): Data => ({ opsi, trx, turunan, seq }), [opsi, trx, turunan, seq]);
  const impor = useCallback((inc: Data, mode: "gabung" | "ganti") => {
    const d = mode === "ganti" ? inc : gabung({ opsi, trx, turunan, seq }, inc);
    const r = rapikan(d.opsi, d.trx);
    setOpsi(r.opsi); setTrx(r.trx); setTurunan(d.turunan); setSeq(d.seq);
  }, [opsi, trx, turunan, seq, setOpsi, setTrx, setTurunan, setSeq]);

  return {
    opsi, trx, turunan, idx, byKode, total,
    tambahOpsi, ubahNama, ubahKode, ubahTipe, hapusOpsi,
    kodeBerikut, simpanTrx, hapusTrx,
    buatTurunan, ubahNamaTurunan, keluarkanKode, hapusTurunan,
    ambil, impor,
  };
}
export type Store = ReturnType<typeof useStore>;
