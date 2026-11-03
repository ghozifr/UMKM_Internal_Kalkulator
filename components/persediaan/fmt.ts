const f2 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const f0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const ok = (n: number) => (Number.isFinite(n) ? n : 0);
// Jumlah (kg dll.) dengan maksimal 2 desimal; Rupiah tanpa desimal. Nol ditulis "-" seperti di sheet.
export const q = (n: number) => (Math.abs(ok(n)) < 5e-5 ? "-" : f2.format(ok(n)));
export const rp = (n: number) => (Math.abs(ok(n)) < 0.5 ? "-" : f0.format(Math.round(ok(n))));
export const hg = (n: number) => (Math.abs(ok(n)) < 0.005 ? "-" : f2.format(ok(n)));
export const tgl = (s: string) => s.split("-").reverse().join("/");
export const hariTerakhir = (periode: string) => {
  const [y, m] = periode.split("-").map(Number);
  return `${periode}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
