import type { Indeks } from "./data";
import type { Transaksi } from "./types";

/* =====================================================================
   Persediaan bahan baku (TPBB). Semua angka dihitung dari Tabel Induk, tidak diketik dua kali.
   Metode nilai persediaan: rata-rata tertimbang per bulan, sama seperti sheet TPBB:
     harga rata-rata = (total stok awal + total pembelian) / (jumlah stok awal + jumlah pembelian)
     pemakaian       = takaran resep x jumlah produksi
     stok akhir      = awal + pembelian - pemakaian - penjualan   (diganti hasil opname bila ada)
   ===================================================================== */

export type Barang = {
  id: string;
  nama: string; // dicocokkan dengan Keterangan 1 pada transaksi (tanpa membedakan huruf besar/kecil)
  satuan: string;
  produk: boolean; // true: hasil produksi (mis. Adonan). Hanya jadi pengali resep, stoknya tidak dihitung di TPBB
};
export type Resep = { id: string; produk: string; bahan: string; takaran: number }; // takaran bahan per 1 satuan produk
export type Awal = { periode: string; barang: string; jumlah: number; harga: number };
export type Opname = { id: string; periode: string; tanggal: string; barang: string; real: number; catatan: string };
export type Tutup = { periode: string; tgl: string; akhir: Record<string, [number, number]> }; // id barang -> [jumlah, harga]
export type Pers = {
  barang: Barang[];
  resep: Resep[];
  awal: Awal[];
  opname: Opname[];
  tutup: Tutup[];
  beli: string[]; // id Sub Akun yang dihitung sebagai pembelian bahan baku
  jual: string[]; // id Sub Akun yang dihitung sebagai penjualan bahan baku
};

export const PERS_KOSONG: Pers = { barang: [], resep: [], awal: [], opname: [], tutup: [], beli: [], jual: [] };
export const adaIsi = (p: Pers) => Object.values(p).some((v) => v.length > 0);

/* ---------- Pembantu ---------- */

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
export { r4 as bulat4 };

// Jumlah produksi di Keterangan 2: angka biasa, desimal dengan koma atau titik (maksimal 2 digit). Pemisah ribuan
// ditolak, sebab "1.250" bisa berarti seribu dua ratus lima puluh atau 1,25 dan tidak boleh ditebak.
const KET2_ANGKA = /^\d+([.,]\d{1,2})?$/;
export function angkaKet2(s: string): number | null {
  const v = s.trim();
  if (!KET2_ANGKA.test(v)) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export const PERIODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const periodeIni = () => new Date().toLocaleDateString("sv-SE").slice(0, 7);
export function geserPeriode(p: string, d: number) {
  const [y, m] = p.split("-").map(Number);
  const t = y * 12 + (m - 1) + d;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const namaPeriode = (p: string) => `${BULAN[Number(p.slice(5, 7)) - 1] ?? p} ${p.slice(0, 4)}`;

/* ---------- Membersihkan data dari database atau file cadangan ---------- */

const s = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const larik = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function normalisasiPers(raw: unknown): Pers {
  const r = obj(raw);
  const p: Pers = {
    barang: larik(r.barang).map(obj).filter((b) => s(b.id) && s(b.nama)).map((b) => ({
      id: s(b.id), nama: s(b.nama), satuan: s(b.satuan, 20) || "Kg", produk: b.produk === true,
    })),
    resep: larik(r.resep).map(obj).filter((x) => s(x.id) && s(x.produk) && s(x.bahan)).map((x) => ({
      id: s(x.id), produk: s(x.produk), bahan: s(x.bahan), takaran: n(x.takaran),
    })),
    awal: larik(r.awal).map(obj).filter((a) => PERIODE_RE.test(s(a.periode)) && s(a.barang)).map((a) => ({
      periode: s(a.periode), barang: s(a.barang), jumlah: n(a.jumlah), harga: n(a.harga),
    })),
    opname: larik(r.opname).map(obj).filter((o) => s(o.id) && PERIODE_RE.test(s(o.periode)) && s(o.barang)).map((o) => ({
      id: s(o.id), periode: s(o.periode), tanggal: /^\d{4}-\d{2}-\d{2}$/.test(s(o.tanggal)) ? s(o.tanggal) : `${s(o.periode)}-01`,
      barang: s(o.barang), real: n(o.real), catatan: s(o.catatan, 300),
    })),
    tutup: larik(r.tutup).map(obj).filter((t) => PERIODE_RE.test(s(t.periode))).map((t) => ({
      periode: s(t.periode), tgl: s(t.tgl, 10),
      akhir: Object.fromEntries(Object.entries(obj(t.akhir)).map(([k, v]) => {
        const a = larik(v);
        return [k, [n(a[0]), n(a[1])] as [number, number]];
      })),
    })),
    beli: larik(r.beli).map((x) => s(x)).filter(Boolean),
    jual: larik(r.jual).map((x) => s(x)).filter(Boolean),
  };
  return adaIsi(p) ? p : PERS_KOSONG;
}

/* ---------- Perhitungan TPBB ---------- */

export type BarisTPBB = {
  barang: Barang;
  awal: { jumlah: number; harga: number; total: number };
  beli: { jumlah: number; total: number; harga: number; trx: Transaksi[] };
  pakai: { takaran: number; jumlah: number; total: number; rinci: { produk: Barang; takaran: number; produksi: number }[] };
  jual: { jumlah: number; total: number; omzet: number; trx: Transaksi[] };
  harga: number; // harga rata-rata
  sistem: { jumlah: number; total: number }; // stok sistem pada akhir bulan, sebelum adjustment
  sistemPada: (tanggal: string) => number; // stok sistem sampai tanggal itu (dipakai membandingkan dengan opname)
  opname?: Opname;
  selisih: number; // stok real - stok sistem pada tanggal opname
  adjRp: number;
  akhir: { jumlah: number; total: number };
};
export type Produksi = { barang: Barang; jumlah: number; trx: Transaksi[] };
export type HasilTPBB = {
  baris: BarisTPBB[];
  produksi: Produksi[];
  total: { awal: number; beli: number; pakai: number; jual: number; adj: number; akhir: number };
  peringatan: string[];
  belumTerdaftar: { nama: string; produk: boolean }[];
};

export function hitungTPBB(pers: Pers, trx: readonly Transaksi[], idx: Indeks, periode: string): HasilTPBB {
  const awalDari = new Map(pers.awal.filter((a) => a.periode === periode).map((a) => [a.barang, a]));
  const bahan = pers.barang.filter((b) => !b.produk);
  const produkList = pers.barang.filter((b) => b.produk);
  const byNama = new Map(pers.barang.map((b) => [norm(b.nama), b]));
  const beliSet = new Set(pers.beli), jualSet = new Set(pers.jual);

  const beli = new Map<string, Transaksi[]>(), jual = new Map<string, Transaksi[]>(), prod = new Map<string, Transaksi[]>();
  const produksiJml = new Map<string, number>();
  const peringatan: string[] = [];
  const asing = new Map<string, boolean>(); // nama belum terdaftar -> hasil produksi?
  const tambah = (m: Map<string, Transaksi[]>, k: string, t: Transaksi) => { const a = m.get(k); if (a) a.push(t); else m.set(k, [t]); };

  const awalBulan = `${periode}-`;
  for (const t of trx) {
    if (!t.tanggal.startsWith(awalBulan)) continue;
    const key = norm(t.ket1);
    if (t.aid && idx.byId.get(t.aid)?.produksi) {
      if (!key) { peringatan.push(`${t.kode}: baris produksi tanpa Keterangan 1 (nama produk).`); continue; }
      const q = angkaKet2(t.ket2);
      if (q === null || q <= 0) { peringatan.push(`${t.kode}: Keterangan 2 "${t.ket2}" bukan angka jumlah produksi, tidak dihitung.`); continue; }
      const b = byNama.get(key);
      if (!b) { asing.set(t.ket1.trim(), true); continue; }
      if (!b.produk) { peringatan.push(`${t.kode}: "${b.nama}" terdaftar sebagai bahan baku, bukan hasil produksi.`); continue; }
      tambah(prod, b.id, t);
      produksiJml.set(b.id, (produksiJml.get(b.id) ?? 0) + q);
    } else if (t.sid && (beliSet.has(t.sid) || jualSet.has(t.sid))) {
      const b = key ? byNama.get(key) : undefined;
      if (!b || b.produk) {
        if (key) asing.set(t.ket1.trim(), false);
        else peringatan.push(`${t.kode}: transaksi persediaan tanpa Keterangan 1 (nama barang), tidak dihitung.`);
        continue;
      }
      if (beliSet.has(t.sid)) {
        tambah(beli, b.id, t);
        if (!(t.harga > 0)) peringatan.push(`${t.kode}: pembelian ${b.nama} tanpa harga.`);
      } else tambah(jual, b.id, t);
    }
  }

  const baris: BarisTPBB[] = bahan.map((b) => {
    const a = awalDari.get(b.id);
    const awal = { jumlah: a?.jumlah ?? 0, harga: a?.harga ?? 0, total: (a?.jumlah ?? 0) * (a?.harga ?? 0) };
    const bt = beli.get(b.id) ?? [];
    const bj = bt.reduce((x, t) => x + t.jumlah, 0), bTot = bt.reduce((x, t) => x + t.jumlah * t.harga, 0);
    const qty = awal.jumlah + bj;
    const harga = qty > 0 ? (awal.total + bTot) / qty : awal.harga;

    const rinci = pers.resep
      .filter((x) => x.bahan === b.id)
      .flatMap((x) => {
        const produk = pers.barang.find((p) => p.id === x.produk && p.produk);
        return produk ? [{ produk, takaran: x.takaran, produksi: produksiJml.get(produk.id) ?? 0 }] : [];
      });
    const pj = rinci.reduce((x, r) => x + r.takaran * r.produksi, 0);
    const jt = jual.get(b.id) ?? [];
    const jj = jt.reduce((x, t) => x + t.jumlah, 0);

    // Stok sistem sampai suatu tanggal (hari itu ikut dihitung). Opname dibandingkan dengan stok pada tanggalnya,
    // jadi transaksi sesudah tanggal opname tetap ikut menambah atau mengurangi stok akhir.
    const produksiSampai = (id: string, tgl: string) => (prod.get(id) ?? []).reduce((x, t) => (t.tanggal <= tgl ? x + (angkaKet2(t.ket2) ?? 0) : x), 0);
    const sistemPada = (tgl: string) =>
      awal.jumlah
      + bt.reduce((x, t) => (t.tanggal <= tgl ? x + t.jumlah : x), 0)
      - rinci.reduce((x, r) => x + r.takaran * produksiSampai(r.produk.id, tgl), 0)
      - jt.reduce((x, t) => (t.tanggal <= tgl ? x + t.jumlah : x), 0);
    const sistemJ = awal.jumlah + bj - pj - jj;
    const ops = pers.opname.filter((o) => o.periode === periode && o.barang === b.id);
    const opname = ops.reduce<Opname | undefined>((p, o) => (!p || o.tanggal >= p.tanggal ? o : p), undefined);
    const selisih = opname ? opname.real - sistemPada(opname.tanggal) : 0;
    const akhirJ = sistemJ + selisih;
    if (!opname && sistemJ < -1e-9) peringatan.push(`Stok sistem ${b.nama} negatif (${r4(sistemJ)} ${b.satuan}). Periksa pembelian, resep, atau stok awal.`);

    return {
      barang: b, awal,
      beli: { jumlah: bj, total: bTot, harga: bj > 0 ? bTot / bj : 0, trx: bt },
      pakai: { takaran: rinci.reduce((x, r) => x + r.takaran, 0), jumlah: pj, total: pj * harga, rinci },
      jual: { jumlah: jj, total: jj * harga, omzet: jt.reduce((x, t) => x + t.jumlah * t.harga, 0), trx: jt },
      harga,
      sistem: { jumlah: sistemJ, total: sistemJ * harga }, sistemPada,
      opname, selisih, adjRp: selisih * harga,
      akhir: { jumlah: akhirJ, total: akhirJ * harga },
    };
  });

  const sum = (f: (b: BarisTPBB) => number) => baris.reduce((x, b) => x + f(b), 0);
  return {
    baris,
    produksi: produkList.map((b) => ({ barang: b, jumlah: produksiJml.get(b.id) ?? 0, trx: prod.get(b.id) ?? [] })),
    total: {
      awal: sum((b) => b.awal.total), beli: sum((b) => b.beli.total), pakai: sum((b) => b.pakai.total),
      jual: sum((b) => b.jual.total), adj: sum((b) => b.adjRp), akhir: sum((b) => b.akhir.total),
    },
    peringatan,
    belumTerdaftar: [...asing].map(([nama, produk]) => ({ nama, produk })),
  };
}

/* ---------- Tutup bulan ---------- */

// Stok akhir bulan ini menjadi stok awal bulan depan.
export function tutupBulan(p: Pers, h: HasilTPBB, periode: string, tgl: string): Pers {
  const depan = geserPeriode(periode, 1);
  const akhir: Tutup["akhir"] = {};
  const awalBaru: Awal[] = h.baris.map((b) => {
    const j = r4(b.akhir.jumlah), hg = r6(b.harga);
    akhir[b.barang.id] = [j, hg];
    return { periode: depan, barang: b.barang.id, jumlah: Math.max(0, j), harga: hg };
  });
  return {
    ...p,
    awal: [...p.awal.filter((a) => a.periode !== depan), ...awalBaru],
    tutup: [...p.tutup.filter((t) => t.periode !== periode), { periode, tgl, akhir }],
  };
}
export const bukaKembali = (p: Pers, periode: string): Pers => ({ ...p, tutup: p.tutup.filter((t) => t.periode !== periode) });

// Apakah angka bulan ini berbeda dari saat ditutup (mis. ada transaksi diubah atau ditambah sesudahnya)?
export function berubahSetelahTutup(h: HasilTPBB, t: Tutup): boolean {
  for (const b of h.baris) {
    const c = t.akhir[b.barang.id];
    if (!c) return true;
    if (c[0] !== r4(b.akhir.jumlah) || c[1] !== r6(b.harga)) return true;
  }
  return false;
}
