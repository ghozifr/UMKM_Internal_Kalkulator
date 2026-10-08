export type Level = "akun" | "subAkun" | "kas" | "ket1";
export type Tipe = "masuk" | "keluar";

// Satu pilihan dropdown. parentId dipakai untuk pilihan bertingkat
// (Sub Akun mengikuti Akun, Keterangan 1 mengikuti Sub Akun).
export type Opsi = {
  id: string;
  level: Level;
  nama: string;
  kode?: string; // singkatan untuk kode transaksi (hanya Akun, Sub Akun, Keterangan 1)
  parentId?: string;
  tipe?: Tipe; // hanya Akun
};

// Transaksi menyimpan teks agar riwayat tetap utuh walaupun pilihan dihapus.
// Id pilihan ikut disimpan supaya baris bisa dikelompokkan per Sub Akun dan
// ikut berubah saat nama pilihan diganti. "" berarti pilihan sudah tidak ada.
export type Transaksi = {
  id: string;
  kode: string; // contoh: PEN-PBB-M-001
  tanggal: string; // YYYY-MM-DD
  tipe: Tipe;
  akun: string;
  subAkun: string;
  kas: string;
  ket1: string;
  ket2: string; // diketik manual
  ket3: string; // diketik manual
  jumlah: number;
  harga: number;
  aid?: string;
  sid?: string;
  kid?: string;
  k1id?: string;
};

// Tabel turunan = kumpulan Kode dari Tabel Induk (rujukan, bukan salinan)
export type Turunan = { id: string; nama: string; kodes: string[] };

export const LEVEL_LABEL: Record<Level, string> = {
  akun: "Akun", subAkun: "Sub Akun", kas: "Kas", ket1: "Keterangan 1",
};
export const LEVELS = Object.keys(LEVEL_LABEL) as Level[];
export const PARENT: Partial<Record<Level, Level>> = { subAkun: "akun", ket1: "subAkun" };
export const BERKODE: readonly Level[] = ["akun", "subAkun", "ket1"];

const o = (id: string, level: Level, nama: string, extra: Partial<Opsi> = {}): Opsi => ({ id, level, nama, ...extra });

// Data awal sesuai gambar; semuanya bisa diubah lewat tombol "Kelola".
export const SEED: Opsi[] = [
  o("a1", "akun", "Pemasukan", { tipe: "masuk", kode: "PEM" }),
  o("a2", "akun", "Pengeluaran", { tipe: "keluar", kode: "PEN" }),
  o("s1", "subAkun", "Penjualan", { parentId: "a1", kode: "P" }),
  o("s2", "subAkun", "Bayar Piutang", { parentId: "a1", kode: "BP" }),
  o("s3", "subAkun", "Pembelian Bahan Baku", { parentId: "a2", kode: "PBB" }),
  o("s4", "subAkun", "Bayar Gaji Grup", { parentId: "a2", kode: "BGG" }),
  o("s5", "subAkun", "Bayar Gaji Operasional", { parentId: "a2", kode: "BGO" }),
  o("k1", "ket1", "Produk", { parentId: "s1", kode: "P" }),
  o("k2", "ket1", "Minyak", { parentId: "s3", kode: "M" }),
  o("k3", "ket1", "Pisang", { parentId: "s3", kode: "P" }),
  o("c1", "kas", "Kas Tunai"),
  o("c2", "kas", "Rekening Bank"),
];
