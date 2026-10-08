import { BERKODE, LEVELS, type Level, type Opsi, type Tipe, type Transaksi, type Turunan } from "./types";
import { POLA, formatKode, lengkapiKode, nomorTerbesar, singkat } from "./kode";

// Nomor urut terakhir per awalan kode, supaya nomor tidak dipakai ulang setelah baris dihapus.
export type Seq = Record<string, number>;
export type Data = { opsi: Opsi[]; trx: Transaksi[]; turunan: Turunan[]; seq: Seq };

export const newId = () => Math.random().toString(36).slice(2, 9);

/* ---------- Indeks pilihan: pencarian O(1) ---------- */

export const kunciAnak = (level: Level, parentId?: string) => `${level}|${parentId ?? ""}`;
const KOSONG: Opsi[] = [];

export function indeks(opsi: readonly Opsi[]) {
  const byId = new Map<string, Opsi>();
  const anak = new Map<string, Opsi[]>();
  for (const o of opsi) {
    byId.set(o.id, o);
    const k = kunciAnak(o.level, o.parentId);
    const a = anak.get(k);
    if (a) a.push(o);
    else anak.set(k, [o]);
  }
  return { byId, anak };
}
export type Indeks = ReturnType<typeof indeks>;
export const daftar = (ix: Indeks, level: Level, parentId?: string): Opsi[] =>
  ix.anak.get(kunciAnak(level, parentId)) ?? KOSONG;

/* ---------- Perubahan pilihan yang ikut memperbarui transaksi ---------- */

const KOLOM = {
  akun: ["aid", "akun"], subAkun: ["sid", "subAkun"], kas: ["kid", "kas"], ket1: ["k1id", "ket1"],
} as const;

// Ganti nama pilihan di semua transaksi yang memakainya.
export function ubahTeks(trx: Transaksi[], level: Level, id: string, nama: string): Transaksi[] {
  const [fi, ft] = KOLOM[level];
  let ada = false;
  const out = trx.map((t) => {
    if (t[fi] !== id || t[ft] === nama) return t;
    ada = true;
    return { ...t, [ft]: nama } as Transaksi;
  });
  return ada ? out : trx;
}

export function ubahTipeTrx(trx: Transaksi[], akunId: string, tipe: Tipe): Transaksi[] {
  let ada = false;
  const out = trx.map((t) => {
    if (t.aid !== akunId || t.tipe === tipe) return t;
    ada = true;
    return { ...t, tipe };
  });
  return ada ? out : trx;
}

// Hapus pilihan beserta turunannya (Akun -> Sub Akun -> Keterangan 1).
export function hapusCascade(opsi: Opsi[], id: string): Opsi[] {
  const gone = new Set([id]);
  let n: number;
  do {
    n = gone.size;
    for (const x of opsi) if (x.parentId && gone.has(x.parentId)) gone.add(x.id);
  } while (gone.size !== n);
  return opsi.filter((x) => !gone.has(x.id));
}

/* ---------- Rapikan data lama ---------- */

const lc = (s: string) => s.toLowerCase();

// - buang pilihan dari level yang sudah tidak ada (Keterangan 2 dan 3 kini diketik manual)
// - isi singkatan yang kosong
// - hubungkan transaksi lama ke id pilihannya (dicocokkan lewat nama)
// Mengembalikan array yang sama jika tidak ada yang perlu diubah.
export function rapikan(opsi: Opsi[], trx: Transaksi[]): { opsi: Opsi[]; trx: Transaksi[] } {
  let o = opsi;
  if (o.some((x) => !LEVELS.includes(x.level))) o = o.filter((x) => LEVELS.includes(x.level));
  o = lengkapiKode(o);

  let t = trx;
  if (t.some((x) => x.aid === undefined)) {
    const akun = new Map<string, Opsi>(), kas = new Map<string, Opsi>();
    const sub = new Map<string, Opsi>(), k1 = new Map<string, Opsi>();
    for (const x of o) {
      if (x.level === "akun") akun.set(lc(x.nama), x);
      else if (x.level === "kas") kas.set(lc(x.nama), x);
      else if (x.level === "subAkun") sub.set(`${x.parentId}|${lc(x.nama)}`, x);
      else k1.set(`${x.parentId}|${lc(x.nama)}`, x);
    }
    t = t.map((x) => {
      if (x.aid !== undefined) return x;
      const a = akun.get(lc(x.akun));
      const s = a && sub.get(`${a.id}|${lc(x.subAkun)}`);
      const k = x.ket1 && s ? k1.get(`${s.id}|${lc(x.ket1)}`) : undefined;
      return { ...x, aid: a?.id ?? "", sid: s?.id ?? "", kid: kas.get(lc(x.kas))?.id ?? "", k1id: k?.id ?? "" };
    });
  }
  return { opsi: o, trx: t };
}

/* ---------- Gabungkan data impor ke data sekarang ---------- */

const RANK: Record<Level, number> = { akun: 0, subAkun: 1, kas: 2, ket1: 3 };

// Tidak menimpa apa pun. Pilihan yang sama (nama dan induk sama) dipakai bersama; kode transaksi
// yang bentrok diberi nomor baru dan rujukan Tabel Turunan ikut disesuaikan.
export function gabung(cur: Data, inc: Data): Data {
  const kunciNama = (o: Opsi) => `${o.level}|${o.parentId ?? ""}|${lc(o.nama)}`;
  const opsi = [...cur.opsi];
  const ids = new Set(opsi.map((o) => o.id));
  const nama = new Map(opsi.map((o) => [kunciNama(o), o.id]));
  const peta = new Map<string, string>(); // id di file -> id di data gabungan

  for (const o of [...inc.opsi].sort((a, b) => RANK[a.level] - RANK[b.level])) {
    const c: Opsi = { ...o, parentId: o.parentId ? peta.get(o.parentId) ?? o.parentId : undefined };
    const sama = nama.get(kunciNama(c));
    if (sama) { peta.set(o.id, sama); continue; }
    while (ids.has(c.id)) c.id = newId();
    peta.set(o.id, c.id);
    if (BERKODE.includes(c.level)) {
      const pakai = new Set<string>();
      for (const x of opsi) if (x.level === c.level && x.parentId === c.parentId && x.kode) pakai.add(x.kode);
      if (!c.kode || pakai.has(c.kode)) c.kode = singkat(c.nama, pakai);
    }
    opsi.push(c); ids.add(c.id); nama.set(kunciNama(c), c.id);
  }

  const seq: Seq = { ...cur.seq };
  for (const [k, v] of Object.entries(inc.seq)) seq[k] = Math.max(seq[k] ?? 0, v);
  const mx = nomorTerbesar(cur.trx);
  const tIds = new Set(cur.trx.map((t) => t.id));
  const kodes = new Set(cur.trx.map((t) => t.kode));
  const ganti = new Map<string, string>();
  const m = (id?: string) => (id ? peta.get(id) ?? id : id);
  const baru: Transaksi[] = [];

  for (const t of inc.trx) {
    if (tIds.has(t.id)) continue;
    let kode = t.kode;
    if (kodes.has(kode)) {
      const r = POLA.exec(kode);
      const prefix = r ? r[1] : "TRX";
      let n = Math.max(seq[prefix] ?? 0, mx.get(prefix) ?? 0);
      do { kode = formatKode(prefix, ++n); } while (kodes.has(kode));
      seq[prefix] = n;
      mx.set(prefix, n);
      ganti.set(t.kode, kode);
    }
    kodes.add(kode);
    baru.push({ ...t, kode, aid: m(t.aid), sid: m(t.sid), kid: m(t.kid), k1id: m(t.k1id) });
  }

  const dIds = new Set(cur.turunan.map((x) => x.id));
  const turunan = [
    ...cur.turunan,
    ...inc.turunan.filter((x) => !dIds.has(x.id)).map((x) => ({ ...x, kodes: x.kodes.map((k) => ganti.get(k) ?? k) })),
  ];
  return { opsi, trx: [...baru, ...cur.trx], turunan, seq };
}
