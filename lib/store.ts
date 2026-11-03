"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { hitung } from "./format";
import { angkaKet2, norm, type Pers } from "./persediaan";
import { BERKODE, type Level, type Opsi, type Tipe, type Transaksi, type Turunan } from "./types";
import { formatKode, nomorTerbesar, prefixKode, singkat } from "./kode";
import {
  daftar, gabung, hapusCascade, indeks, newId, rapikan, ubahTeks, ubahTipeTrx, type Data, type Seq,
} from "./data";

export type Input = {
  tanggal: string; akunId: string; subId: string; kasId: string; k1Id: string;
  ket2: string; ket3: string; jumlah: number; harga: number;
};

type Slot<T> = readonly [T, Dispatch<SetStateAction<T>>];
export type Sumber = { opsi: Slot<Opsi[]>; trx: Slot<Transaksi[]>; turunan: Slot<Turunan[]>; seq: Slot<Seq>; pers: Slot<Pers> };

// Satu-satunya tempat logika data aplikasi. Komponen hanya membaca data dan memanggil aksi di sini.
// Tempat data disimpan (database akun) disediakan lewat `sumber`.
export function useStore(sumber: Sumber) {
  const [opsi, setOpsi] = sumber.opsi;
  const [trx, setTrx] = sumber.trx;
  const [turunan, setTurunan] = sumber.turunan;
  const [seq, setSeq] = sumber.seq;
  const [pers, setPers] = sumber.pers;

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
  const tambahOpsi = useCallback((level: Level, parentId: string | undefined, nama: string, tipe: Tipe, produksi = false) => {
    setOpsi((o) => {
      const saudara = o.filter((x) => x.level === level && x.parentId === parentId);
      if (saudara.some((x) => x.nama.toLowerCase() === nama.toLowerCase())) return o;
      const baru: Opsi = { id: newId(), level, nama, parentId };
      if (BERKODE.includes(level)) baru.kode = singkat(nama, new Set(saudara.flatMap((x) => (x.kode ? [x.kode] : []))));
      if (level === "akun") { baru.tipe = tipe; if (produksi) baru.produksi = true; }
      return [...o, baru];
    });
  }, [setOpsi]);

  const ubahNama = useCallback((level: Level, id: string, nama: string) => {
    const cur = idx.byId.get(id);
    if (!cur || cur.nama === nama) return;
    if (daftar(idx, level, cur.parentId).some((x) => x.id !== id && x.nama.toLowerCase() === nama.toLowerCase())) return;
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, nama } : x)));
    setTrx((t) => ubahTeks(t, level, id, nama));
    // Barang persediaan dicocokkan lewat nama Keterangan 1, jadi ikut diganti agar tidak terputus dari transaksinya
    if (level === "ket1" && !opsi.some((x) => x.level === "ket1" && x.id !== id && norm(x.nama) === norm(cur.nama))) {
      setPers((p) => (p.barang.some((b) => norm(b.nama) === norm(cur.nama))
        ? { ...p, barang: p.barang.map((b) => (norm(b.nama) === norm(cur.nama) ? { ...b, nama } : b)) } : p));
    }
  }, [idx, opsi, setOpsi, setTrx, setPers]);

  const ubahKode = useCallback((id: string, kode: string) => {
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, kode } : x)));
  }, [setOpsi]);

  const ubahTipe = useCallback((id: string, tipe: Tipe) => {
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, tipe } : x)));
    setTrx((t) => ubahTipeTrx(t, id, tipe));
  }, [setOpsi, setTrx]);

  const ubahProduksi = useCallback((id: string, produksi: boolean) => {
    setOpsi((o) => o.map((x) => (x.id === id ? { ...x, produksi: produksi || undefined } : x)));
  }, [setOpsi]);

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
    // Akun produksi: Keterangan 1 (nama produk) wajib dan Keterangan 2 wajib angka (jumlah produksi)
    if (akun.produksi) {
      const q = angkaKet2(f.ket2);
      if (!k1 || q === null || q <= 0) return null;
    }
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
  const ambil = useCallback((): Data => ({ opsi, trx, turunan, seq, pers }), [opsi, trx, turunan, seq, pers]);
  const impor = useCallback((inc: Data, mode: "gabung" | "ganti") => {
    const d = mode === "ganti" ? inc : gabung({ opsi, trx, turunan, seq, pers }, inc);
    const r = rapikan(d.opsi, d.trx);
    setOpsi(r.opsi); setTrx(r.trx); setTurunan(d.turunan); setSeq(d.seq); setPers(d.pers);
  }, [opsi, trx, turunan, seq, pers, setOpsi, setTrx, setTurunan, setSeq, setPers]);

  return {
    opsi, trx, turunan, pers, setPers, idx, byKode, total,
    tambahOpsi, ubahNama, ubahKode, ubahTipe, ubahProduksi, hapusOpsi,
    kodeBerikut, simpanTrx, hapusTrx,
    buatTurunan, ubahNamaTurunan, keluarkanKode, hapusTurunan,
    ambil, impor,
  };
}
export type Store = ReturnType<typeof useStore>;
