import { hitung } from "./format";
import type { Worksheet } from "exceljs";
import type { Transaksi } from "./types";

export type Sheet = { nama: string; rows: Transaksi[] };

const RP = '"Rp" #,##0';
const HEAD = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } } as const;
const SUB = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F4F1" } } as const;
const B = { style: "thin", color: { argb: "FFCBD5E1" } } as const;
const box = { top: B, left: B, bottom: B, right: B };
const COLS = ["No", "Kode", "Tanggal", "Akun", "Sub Akun", "Kas", "Keterangan 1", "Keterangan 2", "Keterangan 3", "Jumlah", "Harga", "Total", "Jenis"];
const WIDTH = [6, 12, 13, 14, 24, 16, 18, 18, 18, 10, 16, 18, 10];

function tulis(ws: Worksheet, judul: string, data: Transaksi[]) {
  const rows = [...data].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.kode.localeCompare(b.kode));
  WIDTH.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.mergeCells("A1:M1");
  ws.getCell("A1").value = judul;
  ws.getCell("A1").font = { size: 16, bold: true, color: { argb: "FF0F766E" } };

  const first = 8;
  const last = first + Math.max(rows.length, 1) - 1;
  const tot = (tipe: string) => rows.filter((r) => r.tipe === tipe).reduce((s, r) => s + hitung(r.jumlah, r.harga), 0);
  const ringkas: [number, string, string, number][] = [
    [3, "Total Pemasukan", `SUMIF(M${first}:M${last},"Masuk",L${first}:L${last})`, tot("masuk")],
    [4, "Total Pengeluaran", `SUMIF(M${first}:M${last},"Keluar",L${first}:L${last})`, tot("keluar")],
    [5, "Saldo", "L3-L4", tot("masuk") - tot("keluar")],
  ];
  ringkas.forEach(([r, label, formula, result]) => {
    ws.getCell(r, 1).value = label;
    for (let c = 1; c <= 3; c++) { ws.getCell(r, c).fill = SUB; ws.getCell(r, c).font = { bold: true }; }
    const c = ws.getCell(r, 12);
    c.value = { formula, result };
    c.numFmt = RP;
    c.font = { bold: true };
  });

  COLS.forEach((h, i) => {
    const c = ws.getCell(7, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = HEAD;
    c.border = box;
  });

  rows.forEach((t, i) => {
    const r = first + i;
    const [y, m, d] = t.tanggal.split("-").map(Number);
    [i + 1, t.kode, new Date(Date.UTC(y, m - 1, d)), t.akun, t.subAkun, t.kas, t.ket1, t.ket2, t.ket3, t.jumlah, t.harga]
      .forEach((v, c) => (ws.getCell(r, c + 1).value = v));
    ws.getCell(r, 3).numFmt = "dd/mm/yyyy";
    ws.getCell(r, 11).numFmt = RP;
    ws.getCell(r, 12).value = { formula: `J${r}*K${r}`, result: hitung(t.jumlah, t.harga) };
    ws.getCell(r, 12).numFmt = RP;
    ws.getCell(r, 13).value = t.tipe === "masuk" ? "Masuk" : "Keluar";
    for (let c = 1; c <= 13; c++) ws.getCell(r, c).border = box;
  });

  ws.views = [{ state: "frozen", ySplit: 7 }];
  ws.autoFilter = `A7:M${last}`;
}

export async function exportExcel(sheets: Sheet[], file: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const used = new Set<string>();
  sheets.forEach((s) => {
    let nama = s.nama.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Sheet";
    while (used.has(nama.toLowerCase())) nama = `${nama.slice(0, 25)}-${used.size + 1}`;
    used.add(nama.toLowerCase());
    tulis(wb.addWorksheet(nama), s.nama, s.rows);
  });
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = file.replace(/[\\/?*:"<>|]/g, "-");
  a.click();
  URL.revokeObjectURL(url);
}
