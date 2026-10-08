import { LEVELS, type Level, type Opsi, type Tipe, type Transaksi, type Turunan } from "./types";
import { nomorTerbesar } from "./kode";
import type { Data, Seq } from "./data";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/* Format ringkas: baris disimpan sebagai array (tanpa nama kolom berulang), lalu dikompres gzip.
   v2 menambah singkatan kode, id pilihan pada transaksi, dan nomor urut per awalan kode.
   File v1 (versi lama) tetap bisa dibaca. */
const pack = (d: Data) =>
  JSON.stringify({
    v: 2,
    o: d.opsi.map((o) => [o.id, o.level, o.nama, o.parentId ?? "", o.tipe ?? "", o.kode ?? ""]),
    t: d.trx.map((t) => [
      t.id, t.kode, t.tanggal, t.tipe === "masuk" ? 1 : 0, t.akun, t.subAkun, t.kas, t.ket1, t.ket2, t.ket3,
      t.jumlah, t.harga, t.aid ?? "", t.sid ?? "", t.kid ?? "", t.k1id ?? "",
    ]),
    d: d.turunan.map((x) => [x.id, x.nama, x.kodes]),
    s: d.seq,
  });

function unpack(raw: unknown): Data {
  const r = raw as { v?: number; o?: unknown; t?: unknown; d?: unknown; s?: unknown } | null;
  if (!r || (r.v !== 1 && r.v !== 2) || !Array.isArray(r.o) || !Array.isArray(r.t) || !Array.isArray(r.d))
    throw new Error("Format file tidak dikenali. Gunakan file cadangan dari aplikasi ini.");

  const opsi: Opsi[] = [];
  for (const a of r.o as unknown[][]) {
    if (!Array.isArray(a) || !LEVELS.includes(a[1] as Level) || !str(a[0]) || !str(a[2])) continue;
    opsi.push({
      id: str(a[0]), level: a[1] as Level, nama: str(a[2]), parentId: str(a[3]) || undefined,
      tipe: a[4] === "masuk" || a[4] === "keluar" ? (a[4] as Tipe) : undefined,
      kode: str(a[5], 6) || undefined,
    });
  }

  // Id pilihan: ada di v2 (kosong = sudah dihapus); tidak ada di v1 (dicocokkan lewat nama saat dirapikan).
  const opt = (a: unknown[], i: number) => (a.length > i ? str(a[i]) : undefined);
  const trx: Transaksi[] = [];
  for (const a of r.t as unknown[][]) {
    if (!Array.isArray(a) || !str(a[0]) || !str(a[1], 40) || !/^\d{4}-\d{2}-\d{2}$/.test(str(a[2]))) continue;
    trx.push({
      id: str(a[0]), kode: str(a[1], 40), tanggal: a[2] as string, tipe: a[3] === 1 ? "masuk" : "keluar",
      akun: str(a[4]), subAkun: str(a[5]), kas: str(a[6]), ket1: str(a[7]), ket2: str(a[8]), ket3: str(a[9]),
      jumlah: num(a[10]), harga: num(a[11]),
      aid: opt(a, 12), sid: opt(a, 13), kid: opt(a, 14), k1id: opt(a, 15),
    });
  }

  const turunan: Turunan[] = [];
  for (const a of r.d as unknown[][]) {
    if (!Array.isArray(a) || !str(a[0]) || !Array.isArray(a[2])) continue;
    turunan.push({ id: str(a[0]), nama: str(a[1]) || "Tanpa Nama", kodes: (a[2] as unknown[]).map((k) => str(k, 40)).filter(Boolean) });
  }

  const seq: Seq = {};
  if (r.v === 2 && r.s && typeof r.s === "object")
    for (const [k, v] of Object.entries(r.s as Record<string, unknown>)) if (num(v) > 0) seq[str(k, 40)] = num(v);
  for (const [k, v] of nomorTerbesar(trx)) seq[k] = Math.max(seq[k] ?? 0, v);
  return { opsi, trx, turunan, seq };
}

async function gunzip(buf: Uint8Array): Promise<string> {
  const reader = new Blob([buf as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
  const parts: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    if (n > 50_000_000) { await reader.cancel(); throw new Error("Isi file terlalu besar."); }
    parts.push(value);
  }
  return new TextDecoder().decode(await new Blob(parts as BlobPart[]).arrayBuffer());
}

export async function eksporFile(d: Data) {
  const json = pack(d);
  const blob =
    typeof CompressionStream !== "undefined"
      ? await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"))).blob()
      : new Blob([json]);
  const url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `BukuKas-${new Date().toLocaleDateString("sv-SE")}.bkas`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function bacaFile(file: File): Promise<Data> {
  if (file.size > 20_000_000) throw new Error("File terlalu besar untuk diimpor.");
  const buf = new Uint8Array(await file.arrayBuffer());
  let teks: string;
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    if (typeof DecompressionStream === "undefined") throw new Error("Browser ini belum mendukung file terkompresi. Perbarui browser Anda.");
    try { teks = await gunzip(buf); } catch (e) { throw e instanceof Error && e.message.startsWith("Isi") ? e : new Error("File rusak dan tidak bisa dibuka."); }
  } else teks = new TextDecoder().decode(buf);
  let json: unknown;
  try { json = JSON.parse(teks); } catch { throw new Error("File rusak atau bukan cadangan Buku Kas."); }
  return unpack(json);
}

// Dipakai untuk uji di luar browser.
export const _uji = { pack, unpack };
