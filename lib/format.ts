export const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const angka = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0
  );

// Total = jumlah × harga, dibulatkan agar tidak muncul selisih desimal (0.1 × 3).
export const hitung = (jumlah: number, harga: number) => Math.round(jumlah * harga * 100) / 100;
