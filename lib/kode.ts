import { BERKODE, type Opsi, type Transaksi } from "./types";

/* ---------- Singkatan pilihan (Akun, Sub Akun, Keterangan 1) ---------- */

const huruf = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const KODE_RE = /^[A-Z0-9]{1,6}$/;
export const normKode = (s: string) => huruf(s).slice(0, 6);

/* Singkatan dari huruf depan nama. Nama beberapa kata memakai huruf depan tiap kata
   (Pembelian Bahan Baku -> PBB). Nama satu kata memakai huruf depannya (Penjualan -> P).
   Jika kembar dengan pilihan sejenis, huruf berikutnya ditambahkan sampai unik. */
export function singkat(nama: string, dipakai: ReadonlySet<string>): string {
  const kata = nama.trim().split(/\s+/).map(huruf).filter(Boolean);
  const gabung = kata.join("");
  const calon: string[] = [];
  if (kata.length > 1) calon.push(kata.map((k) => k[0]).join(""));
  for (let i = 1; i <= gabung.length; i++) calon.push(gabung.slice(0, i));
  for (const c of calon) {
    const k = c.slice(0, 6);
    if (!dipakai.has(k)) return k;
  }
  const dasar = gabung.slice(0, 3) || "X";
  if (!dipakai.has(dasar)) return dasar; // nama tanpa huruf atau angka
  for (let n = 2; ; n++) {
    const k = dasar + n;
    if (!dipakai.has(k)) return k;
  }
}

const kunci = (o: Opsi) => `${o.level}|${o.parentId ?? ""}`;

// Isi singkatan yang masih kosong (data lama). Mengembalikan array yang sama jika tidak ada yang berubah.
export function lengkapiKode(opsi: Opsi[]): Opsi[] {
  if (!opsi.some((o) => BERKODE.includes(o.level) && !o.kode)) return opsi;
  const pakai = new Map<string, Set<string>>();
  const himpunan = (k: string) => {
    let s = pakai.get(k);
    if (!s) pakai.set(k, (s = new Set()));
    return s;
  };
  for (const o of opsi) if (o.kode) himpunan(kunci(o)).add(o.kode);
  return opsi.map((o) => {
    if (o.kode || !BERKODE.includes(o.level)) return o;
    const s = himpunan(kunci(o));
    const kode = singkat(o.nama, s);
    s.add(kode);
    return { ...o, kode };
  });
}

// Apakah singkatan sudah dipakai pilihan sejenis lain?
export const kodeKembar = (saudara: readonly Opsi[], id: string, kode: string) =>
  saudara.some((x) => x.id !== id && x.kode === kode);

/* ---------- Kode transaksi: AKUN-SUBAKUN-KET1-NNN ---------- */

export const prefixKode = (...o: (Opsi | undefined)[]) =>
  o.map((x) => x?.kode).filter(Boolean).join("-");

export const POLA = /^(.+)-(\d+)$/;
export const formatKode = (prefix: string, n: number) => `${prefix || "TRX"}-${String(n).padStart(3, "0")}`;

// Nomor urut terbesar yang sudah terpakai untuk setiap awalan kode.
export function nomorTerbesar(trx: readonly Transaksi[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of trx) {
    const r = POLA.exec(t.kode);
    if (!r) continue;
    const n = Number(r[2]);
    if (n > (m.get(r[1]) ?? 0)) m.set(r[1], n);
  }
  return m;
}
