export type Level = "akun" | "subAkun" | "kas" | "ket1" | "ket2" | "ket3";
export type Tipe = "masuk" | "keluar";

// Satu pilihan dropdown. parentId dipakai untuk pilihan bertingkat
// (Sub Akun mengikuti Akun, Keterangan 1 mengikuti Sub Akun).
export type Opsi = { id: string; level: Level; nama: string; parentId?: string; tipe?: Tipe };

// Transaksi menyimpan teks (bukan id) agar riwayat tetap utuh
// walaupun pilihan di dropdown nanti diubah atau dihapus.
export type Transaksi = {
  id: string;
  kode: string; // contoh: TRX-0001, unik dan tidak dipakai ulang
  tanggal: string; // YYYY-MM-DD
  tipe: Tipe;
  akun: string;
  subAkun: string;
  kas: string;
  ket1: string;
  ket2: string;
  ket3: string;
  jumlah: number;
  harga: number;
};

export const LEVEL_LABEL: Record<Level, string> = {
  akun: "Akun", subAkun: "Sub Akun", kas: "Kas",
  ket1: "Keterangan 1", ket2: "Keterangan 2", ket3: "Keterangan 3",
};

export const PARENT: Partial<Record<Level, Level>> = { subAkun: "akun", ket1: "subAkun" };

const o = (id: string, level: Level, nama: string, parentId?: string, tipe?: Tipe): Opsi =>
  ({ id, level, nama, parentId, tipe });

// Data awal sesuai gambar; semuanya bisa diubah lewat tombol "Kelola".
export const SEED: Opsi[] = [
  o("a1", "akun", "Pemasukan", undefined, "masuk"),
  o("a2", "akun", "Pengeluaran", undefined, "keluar"),
  o("s1", "subAkun", "Penjualan", "a1"),
  o("s2", "subAkun", "Bayar Piutang", "a1"),
  o("s3", "subAkun", "Pembelian Bahan Baku", "a2"),
  o("s4", "subAkun", "Bayar Gaji Grup", "a2"),
  o("s5", "subAkun", "Bayar Gaji Operasional", "a2"),
  o("k1", "ket1", "Produk", "s1"),
  o("k2", "ket1", "Minyak", "s3"),
  o("k3", "ket1", "Pisang", "s3"),
  o("c1", "kas", "Kas Tunai"),
  o("c2", "kas", "Rekening Bank"),
];

// Tabel turunan = kumpulan Kode dari Tabel Induk (rujukan, bukan salinan)
export type Turunan = { id: string; nama: string; kodes: string[] };
