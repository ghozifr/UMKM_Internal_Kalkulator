import { prefixKode } from "./kode";
import type { Opsi, Tipe, Transaksi, Turunan } from "./types";

// Satu tabel milik satu Sub Akun. Dibuat otomatis dari daftar Sub Akun, jadi
// Sub Akun baru langsung punya tabel sendiri (walau masih kosong).
export type Grup = {
  key: string;
  akunId?: string;
  akun: string;
  nama: string;
  tipe: Tipe;
  prefix: string; // awalan kode transaksi, contoh PEN-PBB
  rows: Transaksi[];
  arsip: boolean; // Sub Akun sudah dihapus tetapi transaksinya masih ada
};

export function kelompokSub(opsi: readonly Opsi[], trx: readonly Transaksi[]): Grup[] {
  const per = new Map<string, Transaksi[]>();
  for (const t of trx) {
    const k = t.sid || `x|${t.akun}|${t.subAkun}`;
    const a = per.get(k);
    if (a) a.push(t);
    else per.set(k, [t]);
  }

  const akuns = opsi.filter((o) => o.level === "akun");
  const urut = new Map(akuns.map((a, i) => [a.id, i]));
  const subs = opsi
    .filter((o) => o.level === "subAkun" && o.parentId !== undefined && urut.has(o.parentId))
    .sort((x, y) => urut.get(x.parentId!)! - urut.get(y.parentId!)!);
  const akunById = new Map(akuns.map((a) => [a.id, a]));

  const grup: Grup[] = [];
  const dipakai = new Set<string>();
  for (const s of subs) {
    const a = akunById.get(s.parentId!)!;
    dipakai.add(s.id);
    grup.push({
      key: s.id, akunId: a.id, akun: a.nama, nama: s.nama, tipe: a.tipe ?? "keluar",
      prefix: prefixKode(a, s), rows: per.get(s.id) ?? [], arsip: false,
    });
  }
  for (const [k, rows] of per) {
    if (dipakai.has(k)) continue;
    grup.push({ key: k, akun: rows[0].akun, nama: rows[0].subAkun, tipe: rows[0].tipe, prefix: "", rows, arsip: true });
  }
  return grup;
}

export function barisTurunan(t: Turunan, byKode: ReadonlyMap<string, Transaksi>): Transaksi[] {
  const out: Transaksi[] = [];
  for (const k of t.kodes) {
    const r = byKode.get(k);
    if (r) out.push(r);
  }
  return out;
}
