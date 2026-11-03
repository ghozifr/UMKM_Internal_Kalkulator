import type { HasilTPBB } from "./persediaan";

const HEAD = (argb: string) => ({ type: "pattern", pattern: "solid", fgColor: { argb } }) as const;
const B = { style: "thin", color: { argb: "FFCBD5E1" } } as const;
const garis = { top: B, left: B, bottom: B, right: B };
const RP = '#,##0';
const QTY = '#,##0.00##';
const HRG = '#,##0.00';
// Format per nomor kolom (A=1 ... S=19)
const FORMAT: Record<number, string> = { 3: QTY, 4: HRG, 5: RP, 6: QTY, 7: RP, 8: HRG, 9: QTY, 10: QTY, 11: RP, 12: QTY, 13: RP, 14: QTY, 15: QTY, 16: QTY, 17: RP, 18: QTY, 19: RP };

// Kolom turunan memakai rumus asli (total, harga rata-rata, stok sistem, selisih, stok akhir),
// jadi angka bisa dicek dan diubah di Excel. Angka dasar (pembelian, pemakaian, penjualan) berupa nilai hasil Tabel Induk.
export async function exportPersediaan(h: HasilTPBB, periode: string, file: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("TPBB");

  const grup: [string, number, string][] = [
    ["Jenis Barang", 2, "FFE2E8F0"], ["Stok Awal", 3, "FFFFE4E6"], ["Pembelian", 3, "FFFFEDD5"], ["Pemakaian", 3, "FFD1FAE5"],
    ["Penjualan", 2, "FFFFEDD5"], ["Stok Sistem", 1, "FFE0F2FE"], ["Stok Opname", 3, "FFFEF3C7"], ["Stok Akhir", 2, "FFEDE9FE"],
  ];
  const kol = ["Barang", "Satuan", "Jumlah", "Harga", "Total", "Jumlah", "Total", "Harga Rata2", "Resep", "Jumlah", "Total", "Jumlah", "Total",
    "Jumlah", "Real", "Selisih", "Adj. (Rp)", "Jumlah", "Total"];
  ws.mergeCells("A1:S1");
  ws.getCell("A1").value = `Tabel Persediaan Bahan Baku, ${periode}`;
  ws.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF0F766E" } };

  let c = 1;
  for (const [t, n, warna] of grup) {
    if (n > 1) ws.mergeCells(3, c, 3, c + n - 1);
    const cell = ws.getCell(3, c);
    cell.value = t; cell.font = { bold: true }; cell.alignment = { horizontal: "center" }; cell.fill = HEAD(warna);
    for (let i = 0; i < n; i++) { ws.getCell(3, c + i).fill = HEAD(warna); ws.getCell(3, c + i).border = garis; }
    c += n;
  }
  kol.forEach((t, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = t; cell.font = { bold: true }; cell.alignment = { horizontal: "center", wrapText: true }; cell.border = garis; cell.fill = HEAD("FFF8FAFC");
  });

  const awal = 5, akhir = awal + h.baris.length - 1;
  h.baris.forEach((b, i) => {
    const r = awal + i;
    const rumus = (col: string, f: string, hasil: number) => { ws.getCell(`${col}${r}`).value = { formula: f, result: hasil }; };
    ws.getCell(`A${r}`).value = b.barang.nama;
    ws.getCell(`B${r}`).value = b.barang.satuan;
    ws.getCell(`C${r}`).value = b.awal.jumlah;
    ws.getCell(`D${r}`).value = b.awal.harga;
    rumus("E", `C${r}*D${r}`, b.awal.total);
    ws.getCell(`F${r}`).value = b.beli.jumlah;
    ws.getCell(`G${r}`).value = b.beli.total;
    rumus("H", `IF(C${r}+F${r}=0,D${r},(E${r}+G${r})/(C${r}+F${r}))`, b.harga);
    ws.getCell(`I${r}`).value = b.pakai.takaran;
    ws.getCell(`J${r}`).value = b.pakai.jumlah;
    rumus("K", `J${r}*H${r}`, b.pakai.total);
    ws.getCell(`L${r}`).value = b.jual.jumlah;
    rumus("M", `L${r}*H${r}`, b.jual.total);
    rumus("N", `C${r}+F${r}-J${r}-L${r}`, b.sistem.jumlah);
    if (b.opname) ws.getCell(`O${r}`).value = b.opname.real;
    rumus("P", `IF(O${r}="",0,O${r}-N${r})`, b.selisih);
    rumus("Q", `P${r}*H${r}`, b.adjRp);
    rumus("R", `IF(O${r}="",N${r},O${r})`, b.akhir.jumlah);
    rumus("S", `R${r}*H${r}`, b.akhir.total);
    for (let k = 1; k <= 19; k++) {
      const cell = ws.getCell(r, k);
      cell.border = garis;
      if (k > 2) cell.numFmt = FORMAT[k];
    }
  });

  const t = akhir + 1;
  ws.getCell(`A${t}`).value = "Total (Rp)"; ws.getCell(`A${t}`).font = { bold: true };
  for (const col of ["E", "G", "K", "M", "Q", "S"]) {
    const total = { E: h.total.awal, G: h.total.beli, K: h.total.pakai, M: h.total.jual, Q: h.total.adj, S: h.total.akhir }[col]!;
    const cell = ws.getCell(`${col}${t}`);
    cell.value = h.baris.length ? { formula: `SUM(${col}${awal}:${col}${akhir})`, result: total } : 0;
    cell.font = { bold: true }; cell.numFmt = RP;
  }
  for (let k = 1; k <= 19; k++) { ws.getCell(t, k).border = garis; ws.getCell(t, k).fill = HEAD("FFF1F5F9"); }

  [22, 8, 11, 12, 15, 11, 15, 12, 9, 12, 15, 11, 15, 12, 11, 11, 14, 12, 15].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];

  if (h.produksi.length) {
    const p = wb.addWorksheet("Produksi");
    p.addRow(["Hasil produksi", "Satuan", "Jumlah"]).font = { bold: true };
    for (const x of h.produksi) p.addRow([x.barang.nama, x.barang.satuan, x.jumlah]);
    p.getColumn(1).width = 24; p.getColumn(3).width = 14;
  }

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file.replace(/[\\/?*:"<>|]/g, "-");
  a.click();
  URL.revokeObjectURL(url);
}
